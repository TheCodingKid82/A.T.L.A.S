import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MessageService } from "@atlas/services";
import { logAudit } from "../middleware/audit-logger.js";

const messageService = new MessageService();

export function registerMessageTools(server: McpServer, agentId: string) {
  server.tool(
    "atlas_message_send",
    "Send a message to a channel",
    {
      channelId: z.string().describe("Channel ID"),
      content: z.string().describe("Message content"),
      priority: z.enum(["URGENT", "HIGH", "NORMAL", "LOW"]).default("NORMAL").describe("Message priority"),
      threadId: z.string().optional().describe("Thread message ID for replies"),
      structuredData: z.any().optional().describe("Structured data payload"),
    },
    async (params) => {
      const start = Date.now();
      const msg = await messageService.send({ ...params, senderId: agentId });
      await logAudit({ agentId, tool: "atlas_message_send", input: { channelId: params.channelId }, output: { id: msg.id }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(msg, null, 2) }] };
    }
  );

  server.tool(
    "atlas_message_send_direct",
    "Send a direct message to another agent",
    {
      targetAgentId: z.string().describe("Target agent ID"),
      content: z.string().describe("Message content"),
      priority: z.enum(["URGENT", "HIGH", "NORMAL", "LOW"]).default("NORMAL").describe("Message priority"),
      structuredData: z.any().optional().describe("Structured data payload"),
    },
    async (params) => {
      const start = Date.now();
      const msg = await messageService.sendDirect({ ...params, senderId: agentId });
      await logAudit({ agentId, tool: "atlas_message_send_direct", input: { targetAgentId: params.targetAgentId }, output: { id: msg.id }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(msg, null, 2) }] };
    }
  );

  server.tool(
    "atlas_message_list",
    "List messages in a channel",
    {
      channelId: z.string().describe("Channel ID"),
      limit: z.number().default(50).describe("Max results"),
      before: z.string().optional().describe("Cursor: messages before this ISO date"),
      threadId: z.string().optional().describe("Filter to thread replies"),
    },
    async (params) => {
      const start = Date.now();
      const messages = await messageService.list(params);
      await logAudit({ agentId, tool: "atlas_message_list", input: params, output: { count: messages.length }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(messages, null, 2) }] };
    }
  );

  server.tool(
    "atlas_message_acknowledge",
    "Acknowledge a message",
    { messageId: z.string().describe("Message ID to acknowledge") },
    async (params) => {
      const start = Date.now();
      const msg = await messageService.acknowledge(params.messageId);
      await logAudit({ agentId, tool: "atlas_message_acknowledge", input: params, output: { id: msg.id }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(msg, null, 2) }] };
    }
  );

  server.tool(
    "atlas_channel_list",
    "List channels the current agent belongs to",
    {},
    async () => {
      const start = Date.now();
      const channels = await messageService.listChannels(agentId);
      await logAudit({ agentId, tool: "atlas_channel_list", output: { count: channels.length }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(channels, null, 2) }] };
    }
  );
}
