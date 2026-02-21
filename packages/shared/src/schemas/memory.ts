import { z } from "zod";

export const MemoryAddSchema = z.object({
  content: z.string().min(1),
  containerTag: z.string().default("atlas-global"),
  metadata: z.record(z.unknown()).optional(),
});

export const MemorySearchSchema = z.object({
  query: z.string().min(1),
  containerTag: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export const MemoryDeleteSchema = z.object({
  id: z.string(),
});

export const MemoryListSchema = z.object({
  containerTag: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});
