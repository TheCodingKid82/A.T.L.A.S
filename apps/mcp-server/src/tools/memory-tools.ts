import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MemoryService } from "@atlas/services";
import { logAudit } from "../middleware/audit-logger.js";

const memoryService = new MemoryService();

export function registerMemoryTools(server: McpServer, agentId: string) {
  server.tool(
    "atlas_memory_add",
    "Add a memory entry to Supermemory",
    {
      content: z.string().describe("Memory content to store"),
      containerTag: z.string().default("atlas-global").describe("Container tag for scoping (e.g. atlas-global, atlas-agent-henry)"),
      metadata: z.record(z.unknown()).optional().describe("Additional metadata"),
    },
    async (params) => {
      const start = Date.now();
      const entry = await memoryService.add(params);
      await logAudit({ agentId, tool: "atlas_memory_add", input: params, output: { id: entry.id }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(entry, null, 2) }] };
    }
  );

  server.tool(
    "atlas_memory_search",
    "Search memories using semantic search",
    {
      query: z.string().describe("Search query"),
      containerTag: z.string().optional().describe("Filter by container tag"),
      limit: z.number().default(10).describe("Max results"),
    },
    async (params) => {
      const start = Date.now();
      const results = await memoryService.search(params);
      await logAudit({ agentId, tool: "atlas_memory_search", input: params, output: { count: Array.isArray(results) ? results.length : 0 }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
    }
  );

  server.tool(
    "atlas_memory_get",
    "Get a specific memory entry by ID",
    { id: z.string().describe("Memory entry ID") },
    async (params) => {
      const start = Date.now();
      const entry = await memoryService.get(params.id);
      await logAudit({ agentId, tool: "atlas_memory_get", input: params, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(entry, null, 2) }] };
    }
  );

  server.tool(
    "atlas_memory_delete",
    "Delete a memory entry",
    { id: z.string().describe("Memory entry ID to delete") },
    async (params) => {
      const start = Date.now();
      const entry = await memoryService.delete(params.id);
      await logAudit({ agentId, tool: "atlas_memory_delete", input: params, output: { id: entry.id }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify({ deleted: true, id: entry.id }, null, 2) }] };
    }
  );

  server.tool(
    "atlas_memory_list",
    "List memory entries with optional filtering",
    {
      containerTag: z.string().optional().describe("Filter by container tag"),
      limit: z.number().default(50).describe("Max results"),
    },
    async (params) => {
      const start = Date.now();
      const entries = await memoryService.list(params);
      await logAudit({ agentId, tool: "atlas_memory_list", input: params, output: { count: entries.length }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(entries, null, 2) }] };
    }
  );
}
