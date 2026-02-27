import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { WorkSessionService } from "@atlas/services";
import { logAudit } from "../middleware/audit-logger.js";

const workSessionService = new WorkSessionService();

export function registerWorkRequestTools(server: McpServer, agentId: string) {
  server.tool(
    "atlas_work_submit",
    "Start a new persistent work session with C.O.D.E. (Claude Orchestrated Development Engine). C.O.D.E. will execute the instructions asynchronously. You can send follow-up messages to this session using atlas_work_continue with the returned sessionId.",
    {
      type: z.enum(["CODE", "RESEARCH", "GITHUB", "BROWSER", "GENERAL"])
        .default("GENERAL")
        .describe("Type of work: CODE (coding tasks), RESEARCH (web research), GITHUB (PRs/issues), BROWSER (web automation), GENERAL (anything else)"),
      title: z.string().describe("Short title for the work session"),
      instructions: z.string().describe("Detailed instructions for what the worker should do"),
      priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"])
        .default("MEDIUM")
        .describe("Priority level"),
      workingDirectory: z.string().optional()
        .describe("Working directory for code tasks (absolute path)"),
      metadata: z.record(z.unknown()).optional()
        .describe("Additional context (e.g. repo URL, branch, file paths)"),
    },
    async (params) => {
      const start = Date.now();
      const session = await workSessionService.createSession({
        ...params,
        requesterId: agentId,
      });
      await logAudit({
        agentId,
        tool: "atlas_work_submit",
        input: params,
        output: { sessionId: session.id },
        duration: Date.now() - start,
      });
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            sessionId: session.id,
            status: session.status,
            message: "Work session started. C.O.D.E. will pick it up shortly. Use atlas_work_continue with this sessionId to send follow-up messages.",
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "atlas_work_continue",
    "Send a follow-up message to an existing work session. C.O.D.E. will resume the Claude Code session and process your message with full conversation context.",
    {
      sessionId: z.string().describe("The work session ID (from atlas_work_submit)"),
      message: z.string().describe("Follow-up instructions or message for the worker"),
    },
    async (params) => {
      const start = Date.now();
      const msg = await workSessionService.addMessage(params.sessionId, params.message, agentId);
      await logAudit({
        agentId,
        tool: "atlas_work_continue",
        input: params,
        output: { messageId: msg.id, sessionId: params.sessionId },
        duration: Date.now() - start,
      });
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            messageId: msg.id,
            sessionId: params.sessionId,
            message: "Follow-up message queued. C.O.D.E. will process it with the existing session context.",
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "atlas_work_status",
    "Get details of a work session including all messages and their statuses",
    {
      id: z.string().describe("Work session ID"),
    },
    async (params) => {
      const start = Date.now();
      const session = await workSessionService.getSession(params.id);
      await logAudit({
        agentId,
        tool: "atlas_work_status",
        input: params,
        duration: Date.now() - start,
      });
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(session, null, 2),
        }],
      };
    }
  );

  server.tool(
    "atlas_work_list",
    "List work sessions with optional filters",
    {
      status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "FAILED", "CANCELLED"])
        .optional()
        .describe("Filter by session status"),
      type: z.enum(["CODE", "RESEARCH", "GITHUB", "BROWSER", "GENERAL"])
        .optional()
        .describe("Filter by type"),
      limit: z.number().default(20).describe("Max results"),
    },
    async (params) => {
      const start = Date.now();
      const results = await workSessionService.listSessions({
        ...params,
        requesterId: agentId,
      });
      await logAudit({
        agentId,
        tool: "atlas_work_list",
        input: params,
        output: { count: results.length },
        duration: Date.now() - start,
      });
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(results, null, 2),
        }],
      };
    }
  );

  server.tool(
    "atlas_work_close",
    "Close or cancel an active work session",
    {
      id: z.string().describe("Work session ID to close"),
      cancel: z.boolean().default(false).describe("If true, cancel instead of completing"),
    },
    async (params) => {
      const start = Date.now();
      const session = params.cancel
        ? await workSessionService.cancelSession(params.id, agentId)
        : await workSessionService.closeSession(params.id, agentId);
      await logAudit({
        agentId,
        tool: "atlas_work_close",
        input: params,
        output: { id: session.id, status: session.status },
        duration: Date.now() - start,
      });
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            sessionId: session.id,
            status: session.status,
          }, null, 2),
        }],
      };
    }
  );
}
