import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTaskTools } from "./task-tools.js";
import { registerMemoryTools } from "./memory-tools.js";
import { registerDocumentTools } from "./document-tools.js";
import { registerMessageTools } from "./message-tools.js";
import { registerBrowserTools } from "./browser-tools.js";
import { registerMcpTools } from "./mcp-tools.js";
import { registerAgentTools } from "./agent-tools.js";

export function registerAllTools(server: McpServer, agentId: string) {
  registerTaskTools(server, agentId);
  registerMemoryTools(server, agentId);
  registerDocumentTools(server, agentId);
  registerMessageTools(server, agentId);
  registerBrowserTools(server, agentId);
  registerMcpTools(server, agentId);
  registerAgentTools(server, agentId);
}
