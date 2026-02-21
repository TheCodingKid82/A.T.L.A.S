import { z } from "zod";

export const TaskCreateSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  tags: z.array(z.string()).default([]),
  columnId: z.string().optional(),
  boardId: z.string().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
});

export const TaskUpdateSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  tags: z.array(z.string()).optional(),
  columnId: z.string().optional(),
  position: z.number().int().min(0).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export const TaskListSchema = z.object({
  boardId: z.string().optional(),
  columnId: z.string().optional(),
  assigneeId: z.string().optional(),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const TaskCloseSchema = z.object({
  id: z.string(),
});

export const BoardCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  columns: z.array(z.string()).optional(),
});
