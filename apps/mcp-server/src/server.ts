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
    });

    // Register all 33 tools with agent context
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
  ║   Tools: 33 across 7 categories                  ║
  ╚══════════════════════════════════════════════════╝
  `);
});
