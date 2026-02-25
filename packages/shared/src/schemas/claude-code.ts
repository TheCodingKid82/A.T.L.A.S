import { z } from "zod";

export const ClaudeCodePromptSchema = z.object({
  prompt: z.string().min(1),
  workingDirectory: z.string().optional(),
  model: z.string().optional(),
});

export const ClaudeCodeSessionContinueSchema = z.object({
  sessionId: z.string().min(1),
  prompt: z.string().min(1),
  workingDirectory: z.string().optional(),
});

export const ClaudeCodeSessionListSchema = z.object({
  limit: z.number().int().positive().optional(),
});
