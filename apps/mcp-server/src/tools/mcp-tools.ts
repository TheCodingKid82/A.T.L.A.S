import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { McpRegistryService } from "@atlas/services";
import { logAudit } from "../middleware/audit-logger.js";

const mcpRegistry = new McpRegistryService();

export function registerMcpTools(server: McpServer, agentId: string) {
  server.tool(
    "atlas_mcp_list",
    "List all registered MCP server connections",
    {},
    async () => {
      const start = Date.now();
      const connections = await mcpRegistry.list();
      await logAudit({ agentId, tool: "atlas_mcp_list", output: { count: connections.length }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(connections, null, 2) }] };
    }
  );

  server.tool(
    "atlas_mcp_get",
    "Get details of a specific MCP connection",
    { id: z.string().describe("MCP connection ID") },
    async (params) => {
      const start = Date.now();
      const connection = await mcpRegistry.get(params.id);
      await logAudit({ agentId, tool: "atlas_mcp_get", input: params, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(connection, null, 2) }] };
    }
  );

  server.tool(
    "atlas_mcp_health",
    "Check health of an MCP connection",
    { id: z.string().describe("MCP connection ID") },
    async (params) => {
      const start = Date.now();
      const result = await mcpRegistry.healthCheck(params.id);
      await logAudit({ agentId, tool: "atlas_mcp_health", input: params, output: { status: result.status }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );
}
