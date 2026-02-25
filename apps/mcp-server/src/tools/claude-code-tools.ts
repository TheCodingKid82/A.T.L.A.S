import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ClaudeCodeService } from "@atlas/services";
import { logAudit } from "../middleware/audit-logger.js";

const claudeCodeService = new ClaudeCodeService();

export function registerClaudeCodeTools(server: McpServer, agentId: string) {
  server.tool(
    "atlas_claude_code_prompt",
    "Run a one-shot Claude Code prompt. Returns result and sessionId for follow-up.",
    {
      prompt: z.string().describe("The prompt to send to Claude Code"),
      workingDirectory: z.string().optional().describe("Working directory for the command"),
      model: z.string().optional().describe("Model to use (e.g. claude-sonnet-4-6)"),
    },
    async (params) => {
      const start = Date.now();
      const result = await claudeCodeService.runPrompt(agentId, params.prompt, {
        workingDirectory: params.workingDirectory,
        model: params.model,
      });
      await logAudit({ agentId, tool: "atlas_claude_code_prompt", input: params, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "atlas_claude_code_session_continue",
    "Continue an existing Claude Code session by ID",
    {
      sessionId: z.string().describe("Session ID from a previous prompt"),
      prompt: z.string().describe("Follow-up prompt"),
      workingDirectory: z.string().optional().describe("Working directory for the command"),
    },
    async (params) => {
      const start = Date.now();
      const result = await claudeCodeService.continueSession(
        agentId,
        params.sessionId,
        params.prompt,
        { workingDirectory: params.workingDirectory }
      );
      await logAudit({ agentId, tool: "atlas_claude_code_session_continue", input: params, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "atlas_claude_code_session_list",
    "List recent Claude Code sessions for this agent",
    {
      limit: z.number().optional().describe("Max sessions to return (default 50)"),
    },
    async (params) => {
      const start = Date.now();
      const result = await claudeCodeService.listSessions(agentId, params.limit);
      await logAudit({ agentId, tool: "atlas_claude_code_session_list", input: params, duration: Date.now() - start });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );
}
