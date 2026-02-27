import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { apiKeyAuth, type AuthenticatedRequest } from "./auth/api-key-auth.js";
import { rateLimiter } from "./middleware/rate-limiter.js";
import { registerAllTools } from "./tools/index.js";

const PORT = parseInt(process.env.PORT || "3001", 10);

const app = express();
app.use(express.json());

// Health check (no auth)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "atlas-mcp-server" });
});

// MCP endpoint with auth
app.all("/mcp", apiKeyAuth as any, rateLimiter as any, async (req: AuthenticatedRequest, res) => {
  const agent = req.agent!;

  try {
    // Create a fresh MCP server instance per request with this agent's context
    const server = new McpServer({
      name: "A.T.L.A.S.",
      version: "0.1.0",
      instructions: `You are connected to A.T.L.A.S. (Automated Task Logic and Agent Supervision) — the central AI orchestration hub that coordinates a team of specialized agents.

Your first action should be to call atlas_agent_whoami to learn who you are, your role, your teammates, and all available tools.

A.T.L.A.S. gives you access to 46 tools across 9 categories:
- Agent: View teammates, update your status
- Tasks: Manage work on Kanban boards
- Memory: Store/search knowledge via Supermemory (use container tags to scope)
- Messages: Communicate with other agents via channels or DMs
- Documents: Create and version shared documents
- Browser: Automate web browsing tasks
- Claude Code: Run prompts, continue sessions, and leverage Claude's coding capabilities
- Work Requests: Submit async work to C.O.D.E. (the worker agent) — coding, GitHub, research, browser tasks. Get updates via DM and #work-log.
- MCP: Check external MCP integrations

You are part of a multi-agent team. Instead of doing heavy coding/browser/GitHub work directly, submit work requests via atlas_work_submit and C.O.D.E. will handle them asynchronously. Coordinate with your teammates through messages and shared tasks. Store important findings in memory so the whole team benefits.`,
    });

    // Register all 46 tools with agent context
    registerAllTools(server, agent.id);

    // Create transport for this request
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    // Connect server to transport
    await server.connect(transport);

    // Handle the request through the transport
    await transport.handleRequest(req, res, req.body);
  } catch (error: any) {
    console.error("MCP request error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║         A.T.L.A.S. MCP Server v0.1.0            ║
  ║                                                  ║
  ║   Automated Task Logic and Agent Supervision     ║
  ║                                                  ║
  ║   MCP Endpoint: http://localhost:${PORT}/mcp        ║
  ║   Health Check: http://localhost:${PORT}/health      ║
  ║   Tools: 46 across 9 categories                  ║
  ╚══════════════════════════════════════════════════╝
  `);
});
