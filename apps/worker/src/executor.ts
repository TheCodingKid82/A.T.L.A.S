import { spawn } from "child_process";
import { WORKER_EXECUTION_TIMEOUT } from "@atlas/shared";
import type { Notifier } from "./notifier.js";

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

/** Build env without CLAUDECODE and ANTHROPIC_API_KEY. */
function cleanEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (k !== "CLAUDECODE" && k !== "ANTHROPIC_API_KEY" && v !== undefined) {
      env[k] = v;
    }
  }
  return env;
}

/**
 * Execute a work message using `claude --print` mode.
 * This pipes the prompt via stdin and reads stdout — no PTY/TUI needed.
 * Much more reliable than trying to interact with the interactive CLI.
 */
export async function executeMessage(
  message: WorkMessage,
  session: WorkSession,
  notifier: Notifier
): Promise<ExecutionResult> {
  const start = Date.now();

  const prompt = await buildPrompt(message, session);
  const cwd =
    session.workingDirectory || process.env.DEFAULT_WORKING_DIR || "/tmp";

  const mode = session.claudeSessionId
    ? "Resuming session"
    : "Starting new session";
  await notifier.send(
    `${mode} — running Claude CLI (print mode)...`,
    "NORMAL"
  );

  const args = [
    "--print",
    "--model", "claude-opus-4-6",
    "--dangerously-skip-permissions",
    "--output-format", "json",
  ];
  if (session.claudeSessionId) {
    args.push("--resume", session.claudeSessionId);
  }

  console.log(
    `[C.O.D.E.] Running: claude ${args.join(" ")} (cwd=${cwd}, prompt=${prompt.length} chars)`
  );

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const proc = spawn("claude", args, {
      cwd,
      env: cleanEnv(),
      stdio: ["pipe", "pipe", "pipe"],
      timeout: WORKER_EXECUTION_TIMEOUT,
    });

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    // Write prompt to stdin and close it
    proc.stdin.write(prompt);
    proc.stdin.end();

    // Safety timeout
    const timer = setTimeout(() => {
      timedOut = true;
      console.warn(`[C.O.D.E.] Timeout after ${WORKER_EXECUTION_TIMEOUT / 1000}s — killing process`);
      proc.kill("SIGTERM");
      setTimeout(() => proc.kill("SIGKILL"), 5_000);
    }, WORKER_EXECUTION_TIMEOUT);

    proc.on("close", (code) => {
      clearTimeout(timer);
      const duration = Date.now() - start;

      if (stderr) {
        console.log(`[C.O.D.E.] stderr: ${stderr.slice(0, 500)}`);
      }

      console.log(`[C.O.D.E.] Process exited (code=${code}, duration=${Math.round(duration / 1000)}s, stdout=${stdout.length} chars)`);

      if (timedOut) {
        resolve({
          summary: "[Timed out]",
          output: stdout || "[Timed out — no output]",
          sessionId: null,
          duration,
        });
        return;
      }

      // Parse JSON output to extract result and session ID
      const { result, sessionId } = parseOutput(stdout);

      const summary = result.length > 500 ? result.slice(0, 500) : result;
      resolve({ summary, output: result, sessionId, duration });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Parse the JSON output from `claude --print --output-format json`.
 * The output is a JSON object with `result` (text) and `session_id` fields.
 */
function parseOutput(stdout: string): { result: string; sessionId: string | null } {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return { result: "[No output]", sessionId: null };
  }

  try {
    const parsed = JSON.parse(trimmed);
    // claude --print --output-format json returns:
    // { result: string, session_id: string, ... }
    const result = parsed.result || parsed.text || trimmed;
    const sessionId = parsed.session_id || null;
    return { result, sessionId };
  } catch {
    // If not JSON, return raw output — might be plain text or error
    // Also try to extract session ID from text output
    const sessionMatch = trimmed.match(/--resume\s+([a-f0-9-]+)/);
    return { result: trimmed, sessionId: sessionMatch?.[1] ?? null };
  }
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
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
    });

    if (!res.ok) return [];

    const data = (await res.json()) as {
      result?: { tools?: Array<{ name: string; description?: string }> };
    };
    return (data.result?.tools ?? []).map(
      (t) => `- ${t.name}${t.description ? ": " + t.description : ""}`
    );
  } catch (err) {
    console.error("[C.O.D.E.] Failed to discover Zapier tools:", err);
    return [];
  }
}

async function buildPrompt(
  message: WorkMessage,
  session: WorkSession
): Promise<string> {
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
  const zapierSection =
    zapierTools.length > 0
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
- **atlas** — A.T.L.A.S. tools for memory, messaging, documents, task management, and more
  - **Browser tools** (persistent profile — stays logged in across sessions):
    - \`atlas_browser_open\` — Navigate to a URL
    - \`atlas_browser_snapshot\` — Get accessibility snapshot of current page
    - \`atlas_browser_click\` — Click an element (CSS selector or accessibility ref)
    - \`atlas_browser_fill\` — Fill a form field
    - \`atlas_browser_screenshot\` — Take a screenshot
    - \`atlas_browser_get_text\` — Extract text from an element
    - \`atlas_browser_execute\` — Execute JavaScript on the page
    - \`atlas_browser_state_save\` / \`atlas_browser_state_load\` — Save/restore browser state (cookies, storage)
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
