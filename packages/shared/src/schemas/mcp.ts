import { z } from "zod";

export const McpGetSchema = z.object({
  id: z.string(),
});

export const McpHealthSchema = z.object({
  id: z.string(),
});
