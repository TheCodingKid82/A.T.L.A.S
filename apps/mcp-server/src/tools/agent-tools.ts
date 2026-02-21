import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AgentService } from "@atlas/services";
import { logAudit } from "../middleware/audit-logger.js";

const agentService = new AgentService();

export function registerAgentTools(server: McpServer, agentId: string) {
  server.tool(
    "atlas_agent_list",
    "List all registered agents",
    {
      status: z.enum(["ONLINE", "OFFLINE", "ERROR", "PROCESSING"]).optional().describe("Filter by status"),
    },
    async (params) => {
      const start = Date.now();
      const agents = await agentService.list(params);
      await logAudit({ agentId, tool: "atlas_agent_list", input: params, output: { count: agents.length }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(agents, null, 2) }] };
    }
  );

  server.tool(
    "atlas_agent_get",
    "Get details of a specific agent",
    { id: z.string().describe("Agent ID") },
    async (params) => {
      const start = Date.now();
      const agent = await agentService.get(params.id);
      await logAudit({ agentId, tool: "atlas_agent_get", input: params, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(agent, null, 2) }] };
    }
  );

  server.tool(
    "atlas_agent_status_update",
    "Update your agent status",
    {
      status: z.enum(["ONLINE", "OFFLINE", "ERROR", "PROCESSING"]).describe("New status"),
    },
    async (params) => {
      const start = Date.now();
      const agent = await agentService.updateStatus(agentId, params.status);
      await logAudit({ agentId, tool: "atlas_agent_status_update", input: params, output: { status: agent.status }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(agent, null, 2) }] };
    }
  );

  server.tool(
    "atlas_agent_whoami",
    "Get your own agent identity and details",
    {},
    async () => {
      const start = Date.now();
      const agent = await agentService.whoami(agentId);
      await logAudit({ agentId, tool: "atlas_agent_whoami", duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(agent, null, 2) }] };
    }
  );
}
