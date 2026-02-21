import { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../auth/api-key-auth.js";

const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimiter(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const agentId = req.agent?.id;
  if (!agentId) return next();

  const now = Date.now();
  const windowMs = 60_000; // 1 minute window
  const maxRequests = 100;

  let entry = requestCounts.get(agentId);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    requestCounts.set(agentId, entry);
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return res.status(429).json({
      error: "Rate limit exceeded",
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    });
  }

  next();
}
