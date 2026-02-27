import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, rm } from "fs/promises";
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

  const prompt = await buildPrompt(message, session);
  const cwd = session.workingDirectory || process.env.DEFAULT_WORKING_DIR || "/tmp";

  // MCP servers (ATLAS, Zapier) are configured in ~/.claude.json by entrypoint.sh.
  // GH_TOKEN and RAILWAY_API_TOKEN are inherited via { ...process.env }.

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
  // MCP servers are configured in ~/.claude.json by entrypoint.sh instead.

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
# Skip permission prompts — worker is non-interactive, no human to approve
export CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS=true
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
}

/** Discover available Zapier tools by querying the MCP tools/list endpoint. */
async function discoverZapierTools(): Promise<string[]> {
  const token = process.env.ZAPIER_MCP_TOKEN;
  if (!token) return [];

  try {
    const res = await fetch("https://mcp.zapier.com/api/v1/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    });

    if (!res.ok) return [];

    const data = (await res.json()) as { result?: { tools?: Array<{ name: string; description?: string }> } };
    return (data.result?.tools ?? []).map(
      (t) => `- ${t.name}${t.description ? ": " + t.description : ""}`
    );
  } catch (err) {
    console.error("[C.O.D.E.] Failed to discover Zapier tools:", err);
    return [];
  }
}

async function buildPrompt(message: WorkMessage, session: WorkSession): Promise<string> {
  // For continuation messages, just send the content directly —
  // Claude Code --resume already has the full conversation context
  if (session.claudeSessionId) {
    return message.content;
  }

  const metadataStr = session.metadata
    ? `\n\nAdditional context:\n${JSON.stringify(session.metadata, null, 2)}`
    : "";

  // Discover available Zapier tools (non-blocking — falls back gracefully)
  const zapierTools = await discoverZapierTools();
  const zapierSection = zapierTools.length > 0
    ? `\n\n**Zapier MCP Tools:**\n${zapierTools.join("\n")}`
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

## Available Tools & CLIs

**MCP Servers:**
- **atlas** — A.T.L.A.S. tools for memory, messaging, documents, browser automation, task management, and more
- **zapier** — Zapier automation tools for cross-app workflows${zapierSection}

**CLIs:**
- \`gh\` — GitHub CLI (authenticated via GH_TOKEN)
- \`railway\` — Railway CLI (authenticated via RAILWAY_API_TOKEN)
- \`git\` — Git (configured for the working directory)

## Workflow Rules

1. **Always commit and push to main.** Do not create pull requests or feature branches unless explicitly asked.
2. **For web apps deployed on Railway:** After pushing, verify the Railway deployment succeeds before completing. Use \`railway status\` or check deployment logs to confirm.
3. **Use ATLAS MCP tools** to update task status, send messages, and store memories as appropriate.
4. **Provide a clear summary** of what was accomplished when done.

Execute this work request thoroughly.`;
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
