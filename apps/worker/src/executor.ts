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
      "--print",
      prompt,
      "--output-format", "json",
    ];

    // Resume existing Claude session if available
    if (session.claudeSessionId) {
      args.push("--resume", session.claudeSessionId);
    }

    // NOTE: --mcp-config is not used. Any MCP config flag (even with
    // --strict-mcp-config and empty servers) causes the CLI to hang
    // during MCP initialization in headless/--print mode.
    // TODO: Investigate CLI fix or use Agent SDK for MCP access.

    const mode = session.claudeSessionId ? "Resuming session" : "Starting new session";
    await notifier.send(`${mode} — executing with Claude Code CLI...`, "NORMAL");

    // Exclude ANTHROPIC_API_KEY from child env — we use OAuth credentials
    // stored in ~/.claude/.credentials.json (persistent volume).
    const childEnv = { ...process.env };
    delete childEnv.ANTHROPIC_API_KEY;

    console.error(`[C.O.D.E.] Exec: claude --print <prompt> --output-format json ${session.claudeSessionId ? "--resume " + session.claudeSessionId : "(new)"}`);

    // Write prompt to a temp file — avoids shell escaping issues with long prompts
    const promptFile = join(cwd, ".claude-prompt-" + Date.now() + ".txt");
    await writeFile(promptFile, prompt, "utf-8");

    // Use a wrapper script because Claude CLI hangs when spawned directly
    // from Node.js execFile (likely due to inherited stdio/IPC file descriptors).
    // Running via bash works reliably.
    const wrapperScript = join(cwd, ".claude-run-" + Date.now() + ".sh");
    const resumeFlag = session.claudeSessionId ? ` --resume '${session.claudeSessionId}'` : "";
    await writeFile(wrapperScript, `#!/bin/bash
unset ANTHROPIC_API_KEY
# Close inherited file descriptors from Node.js (IPC channel, etc.)
for fd in $(seq 3 20); do
  eval "exec \${fd}>&-" 2>/dev/null || true
done
PROMPT=$(cat '${promptFile}')
# Redirect stdin from /dev/null to prevent CLI blocking on pipe input
exec claude --print "$PROMPT" --output-format json${resumeFlag} < /dev/null
`, "utf-8");
    await execFileAsync("chmod", ["+x", wrapperScript]);

    let stdout: string;
    let stderr: string;

    try {
      const result = await execFileAsync(wrapperScript, [], {
        timeout: WORKER_EXECUTION_TIMEOUT,
        cwd,
        maxBuffer: 50 * 1024 * 1024, // 50MB
        env: childEnv,
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (execErr: unknown) {
      const e = execErr as { killed?: boolean; stdout?: string; stderr?: string; code?: number; message?: string };

      if (e.killed) {
        throw new Error(`Execution timed out after ${WORKER_EXECUTION_TIMEOUT / 1000}s`);
      }

      stdout = e.stdout || "";
      stderr = e.stderr || "";
      console.error(`[C.O.D.E.] Claude CLI exited with code ${e.code ?? "unknown"}`);
    } finally {
      // Clean up temp files
      await rm(promptFile, { force: true }).catch(() => {});
      await rm(wrapperScript, { force: true }).catch(() => {});
    }

    if (stderr) {
      console.error("[C.O.D.E.] Claude CLI stderr:", stderr.slice(0, 500));
    }

    const duration = Date.now() - start;

    if (!stdout.trim()) {
      console.error("[C.O.D.E.] Claude CLI returned empty stdout");
      console.error("[C.O.D.E.] Claude CLI stderr (full):", stderr || "(empty)");
      throw new Error("Claude Code CLI returned empty response. Check OAuth credentials and CLI version.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      parsed = { rawOutput: stdout.trim() };
    }

    // Check for CLI-level errors (auth failures, etc.)
    if (parsed && typeof parsed === "object" && (parsed as Record<string, unknown>).is_error === true) {
      const errResult = (parsed as Record<string, unknown>).result as string;
      console.error("[C.O.D.E.] Claude CLI returned error:", errResult);
      throw new Error(`Claude Code CLI error: ${errResult}`);
    }

    // Extract session ID if available
    const sessionId =
      parsed && typeof parsed === "object" && parsed !== null && "session_id" in parsed
        ? (parsed as Record<string, unknown>).session_id as string
        : null;

    const summary = extractSummary(parsed);

    return { summary, output: parsed, sessionId, duration };
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
