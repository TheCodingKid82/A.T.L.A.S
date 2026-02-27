import { z } from "zod";

export const WorkSubmitSchema = z.object({
  type: z.enum(["CODE", "RESEARCH", "GITHUB", "BROWSER", "GENERAL"]).default("GENERAL"),
  title: z.string().min(1).max(500),
  instructions: z.string().min(1),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  workingDirectory: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const WorkContinueSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1),
});

export const WorkSessionListSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "FAILED", "CANCELLED"]).optional(),
  type: z.enum(["CODE", "RESEARCH", "GITHUB", "BROWSER", "GENERAL"]).optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const WorkSessionCloseSchema = z.object({
  id: z.string().min(1),
});
