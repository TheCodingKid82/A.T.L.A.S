import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TaskService } from "@atlas/services";
import { logAudit } from "../middleware/audit-logger.js";

const taskService = new TaskService();

export function registerTaskTools(server: McpServer, agentId: string) {
  server.tool(
    "atlas_task_create",
    "Create a new task on a kanban board",
    {
      title: z.string().describe("Task title"),
      description: z.string().optional().describe("Task description"),
      priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM").describe("Task priority"),
      tags: z.array(z.string()).default([]).describe("Task tags"),
      boardId: z.string().optional().describe("Board ID (uses default if omitted)"),
      assigneeId: z.string().optional().describe("Agent ID to assign to"),
      dueDate: z.string().optional().describe("Due date (ISO 8601)"),
    },
    async (params) => {
      const start = Date.now();
      const task = await taskService.create({ ...params, creatorId: agentId });
      await logAudit({ agentId, tool: "atlas_task_create", input: params, output: { id: task.id }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(task, null, 2) }] };
    }
  );

  server.tool(
    "atlas_task_update",
    "Update an existing task",
    {
      id: z.string().describe("Task ID"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional().describe("New priority"),
      tags: z.array(z.string()).optional().describe("New tags"),
      columnId: z.string().optional().describe("Move to column ID"),
      position: z.number().optional().describe("New position in column"),
      assigneeId: z.string().optional().describe("New assignee agent ID"),
      dueDate: z.string().optional().describe("New due date (ISO 8601)"),
    },
    async (params) => {
      const start = Date.now();
      const task = await taskService.update(params.id, params);
      await logAudit({ agentId, tool: "atlas_task_update", input: params, output: { id: task.id }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(task, null, 2) }] };
    }
  );

  server.tool(
    "atlas_task_get",
    "Get a task by ID",
    { id: z.string().describe("Task ID") },
    async (params) => {
      const start = Date.now();
      const task = await taskService.get(params.id);
      await logAudit({ agentId, tool: "atlas_task_get", input: params, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(task, null, 2) }] };
    }
  );

  server.tool(
    "atlas_task_list",
    "List tasks with optional filters",
    {
      boardId: z.string().optional().describe("Filter by board ID"),
      columnId: z.string().optional().describe("Filter by column ID"),
      assigneeId: z.string().optional().describe("Filter by assignee"),
      priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional().describe("Filter by priority"),
      tags: z.array(z.string()).optional().describe("Filter by tags"),
      limit: z.number().default(50).describe("Max results"),
    },
    async (params) => {
      const start = Date.now();
      const tasks = await taskService.list(params);
      await logAudit({ agentId, tool: "atlas_task_list", input: params, output: { count: tasks.length }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(tasks, null, 2) }] };
    }
  );

  server.tool(
    "atlas_task_close",
    "Close a task (move to Complete column)",
    { id: z.string().describe("Task ID to close") },
    async (params) => {
      const start = Date.now();
      const task = await taskService.close(params.id);
      await logAudit({ agentId, tool: "atlas_task_close", input: params, output: { id: task.id }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(task, null, 2) }] };
    }
  );

  server.tool(
    "atlas_board_list",
    "List all kanban boards with columns and tasks",
    {},
    async () => {
      const start = Date.now();
      const boards = await taskService.listBoards();
      await logAudit({ agentId, tool: "atlas_board_list", output: { count: boards.length }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(boards, null, 2) }] };
    }
  );

  server.tool(
    "atlas_board_create",
    "Create a new kanban board",
    {
      name: z.string().describe("Board name"),
      description: z.string().optional().describe("Board description"),
      columns: z.array(z.string()).optional().describe("Column names (defaults to Backlog, In Progress, Review, Complete)"),
    },
    async (params) => {
      const start = Date.now();
      const board = await taskService.createBoard(params);
      await logAudit({ agentId, tool: "atlas_board_create", input: params, output: { id: board.id }, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(board, null, 2) }] };
    }
  );
}
