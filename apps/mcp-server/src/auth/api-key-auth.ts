import { Request, Response, NextFunction } from "express";
import { AgentService } from "@atlas/services";

const agentService = new AgentService();

export interface AuthenticatedRequest extends Request {
  agent?: {
    id: string;
    name: string;
    slug: string;
  };
}

export async function apiKeyAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const apiKey = authHeader.slice(7);
  if (!apiKey.startsWith("atl_")) {
    return res.status(401).json({ error: "Invalid API key format" });
  }

  try {
    const agent = await agentService.authenticateByApiKey(apiKey);
    if (!agent) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    req.agent = {
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
    };

    next();
  } catch (error) {
    return res.status(500).json({ error: "Authentication error" });
  }
}
