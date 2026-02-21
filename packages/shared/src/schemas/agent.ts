import { z } from "zod";

export const AgentStatusUpdateSchema = z.object({
  status: z.enum(["ONLINE", "OFFLINE", "ERROR", "PROCESSING"]),
});

export const AgentListSchema = z.object({
  status: z.enum(["ONLINE", "OFFLINE", "ERROR", "PROCESSING"]).optional(),
});
