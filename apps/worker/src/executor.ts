import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { WORKER_EXECUTION_TIMEOUT } from "@atlas/shared";
import type { Notifier } from "./notifier.js";

const execFileAsync = promisify(execFile);

interface WorkMessage {
  id: string;
  content: string;
  role: string;
}

interface WorkSession {
  id: string;
  type: string;
  title: string;
  priority: string;
  workingDirectory: string | null;
  metadata: unknown;
  requesterId: string;
  claudeSessionId: string | null;
}

export interface ExecutionResult {
  summary: string;
  output: unknown;
  sessionId: string | null;
  duration: number;
}

export async function executeMessage(
  message: WorkMessage,
  session: WorkSession,
  notifier: Notifier
): Promise<ExecutionResult> {
  const start = Date.now();

  const prompt = buildPrompt(message, session);
  const cwd = session.workingDirectory || process.env.DEFAULT_WORKING_DIR || "/tmp";

  // Set up MCP config for the spawned Claude Code CLI so it can access ATLAS
  const mcpConfigDir = join(cwd, ".claude-worker-temp");
  const mcpServerUrl = process.env.ATLAS_MCP_URL || "http://localhost:3001/mcp";
  const workerApiKey = process.env.WORKER_API_KEY;

  let cleanupConfig = false;

  try {
    // Write temporary MCP settings if we have a worker API key
    if (workerApiKey) {
      await mkdir(mcpConfigDir, { recursive: true });

      const mcpServers: Record<string, unknown> = {
        atlas: {
          type: "url",
          url: mcpServerUrl,
          headers: {
            Authorization: `Bearer ${workerApiKey}`,
          },
        },
      };

      // Zapier MCP — available to all Claude Code worker sessions
      mcpServers.zapier = {
        type: "url",
        url: "https://mcp.zapier.com/api/v1/connect",
        headers: {
          Authorization: "Bearer ZGM2ZDFkNmEtZDkyOC00M2YxLWE3NDQtODE2NmY4OWVlYjIxOlBoTHdlRGdKOWFuZnBMbjhQN2pLSDQ2R2pMd1hKSEZsay8xbHQ3TWlWTlE9",
        },
      };

      await writeFile(
        join(mcpConfigDir, "mcp-config.json"),
        JSON.stringify({ mcpServers }),
        "utf-8"
      );
      cleanupConfig = true;
    }

    const args: string[] = [
      "/remote-control",
      "--print",
      prompt,
      "--output-format", "json",
      "--dangerously-skip-permissions",
    ];

    // Resume existing Claude session if available
    if (session.claudeSessionId) {
      args.push("--resume", session.claudeSessionId);
    }

    if (cleanupConfig) {
      args.push("--mcp-config", join(mcpConfigDir, "mcp-config.json"));
    }

    const mode = session.claudeSessionId ? "Resuming session" : "Starting new session";
    await notifier.send(`${mode} — executing with Claude Code CLI...`, "NORMAL");

    const { stdout } = await execFileAsync("claude", args, {
      timeout: WORKER_EXECUTION_TIMEOUT,
      cwd,
      maxBuffer: 50 * 1024 * 1024, // 50MB
      env: {
        ...process.env,
      },
    });

    const duration = Date.now() - start;

    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      parsed = { rawOutput: stdout.trim() };
    }

    // Extract session ID if available
    const sessionId =
      parsed && typeof parsed === "object" && parsed !== null && "session_id" in parsed
        ? (parsed as Record<string, unknown>).session_id as string
        : null;

    const summary = extractSummary(parsed);

    return { summary, output: parsed, sessionId, duration };
  } catch (error: unknown) {
    const duration = Date.now() - start;
    const err = error as { killed?: boolean; message?: string };

    if (err.killed) {
      throw new Error(`Execution timed out after ${WORKER_EXECUTION_TIMEOUT / 1000}s`);
    }

    throw new Error(`Claude Code execution failed (${duration}ms): ${err.message || "Unknown error"}`);
  } finally {
    // Clean up temporary MCP config
    if (cleanupConfig) {
      await rm(mcpConfigDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

function buildPrompt(message: WorkMessage, session: WorkSession): string {
  // For continuation messages, just send the content directly —
  // Claude Code --resume already has the full conversation context
  if (session.claudeSessionId) {
    return message.content;
  }

  // For new sessions, build a full system prompt
  const metadataStr = session.metadata
    ? `\n\nAdditional context:\n${JSON.stringify(session.metadata, null, 2)}`
    : "";

  return `You are C.O.D.E. (Claude Orchestrated Development Engine), a worker agent in the A.T.L.A.S. system.

You have been assigned a work session:

**Title:** ${session.title}
**Type:** ${session.type}
**Priority:** ${session.priority}
**Requester ID:** ${session.requesterId}

**Instructions:**
${message.content}
${metadataStr}

You have access to the ATLAS MCP server tools for memory, messaging, browser automation, and more. You also have access to the local file system and GitHub CLI (gh).

Execute this work request thoroughly. When you are done, provide a clear summary of what was accomplished.`;
}

function extractSummary(parsed: unknown): string {
  if (!parsed || typeof parsed !== "object") return "Work completed.";

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.result === "string") return obj.result.slice(0, 500);

  if (obj.content) {
    if (typeof obj.content === "string") return obj.content.slice(0, 500);
    if (Array.isArray(obj.content)) {
      const textBlock = obj.content.find(
        (c: unknown) => c && typeof c === "object" && (c as Record<string, unknown>).type === "text"
      );
      if (textBlock && typeof (textBlock as Record<string, unknown>).text === "string") {
        return ((textBlock as Record<string, unknown>).text as string).slice(0, 500);
      }
    }
  }

  return "Work completed. See full result for details.";
}
