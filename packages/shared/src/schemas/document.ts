import { z } from "zod";

export const DocumentCreateSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string(),
  mimeType: z.string().default("text/plain"),
  tags: z.array(z.string()).default([]),
});

export const DocumentUpdateSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  changelog: z.string().optional(),
});

export const DocumentListSchema = z.object({
  tags: z.array(z.string()).optional(),
  mimeType: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});
