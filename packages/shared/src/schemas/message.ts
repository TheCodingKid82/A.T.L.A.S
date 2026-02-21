import { z } from "zod";

export const MessageSendSchema = z.object({
  channelId: z.string(),
  content: z.string().min(1),
  priority: z.enum(["URGENT", "HIGH", "NORMAL", "LOW"]).default("NORMAL"),
  threadId: z.string().optional(),
  structuredData: z.any().optional(),
});

export const MessageSendDirectSchema = z.object({
  targetAgentId: z.string(),
  content: z.string().min(1),
  priority: z.enum(["URGENT", "HIGH", "NORMAL", "LOW"]).default("NORMAL"),
  structuredData: z.any().optional(),
});

export const MessageListSchema = z.object({
  channelId: z.string(),
  limit: z.number().int().min(1).max(100).default(50),
  before: z.string().datetime().optional(),
  threadId: z.string().optional(),
});

export const MessageAcknowledgeSchema = z.object({
  messageId: z.string(),
});
