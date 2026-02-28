import { WORKER_EXECUTION_TIMEOUT } from "@atlas/shared";
import type { WorkSessionService } from "@atlas/services";
import type { Notifier } from "./notifier.js";
import { InputManager } from "./input-manager.js";

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

// eslint-disable-next-line no-control-regex
const ANSI_RE = /[\u001B\u009B][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d\/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;

function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}

const inputManager = new InputManager();

/**
 * Execute a work message using an interactive Claude TUI session (PTY).
 * Spawns a new interactive session per message, types the prompt in,
 * collects the response, then exits to extract the session ID.
 * Each session gets Remote Control automatically (remoteControlAtStartup=true).
 */
export async function executeMessage(
  message: WorkMessage,
  session: WorkSession,
  notifier: Notifier,
  messageId: string,
  workSessionService: WorkSessionService
): Promise<ExecutionResult> {
  const start = Date.now();

  const prompt = await buildPrompt(message, session);
  const cwd =
    session.workingDirectory || process.env.DEFAULT_WORKING_DIR || "/tmp";

  const mode = session.claudeSessionId ? "Resuming" : "Starting new";
  await notifier.send(
    `${mode} interactive session (TUI mode)...`,
    "NORMAL"
  );

  console.log(
    `[C.O.D.E.] Spawning interactive TUI session (cwd=${cwd}, prompt=${prompt.length} chars, resume=${session.claudeSessionId || "none"})`
  );

  // Spawn interactive Claude TUI session in PTY
  const ptySession = await inputManager.spawnSession({
    cwd,
    resume: session.claudeSessionId || undefined,
    model: "claude-opus-4-6",
  });

  // Stream partial output to dashboard every 5 seconds
  const progressInterval = setInterval(() => {
    if (ptySession.responseBuffer.length > 0) {
      const partial = stripAnsi(ptySession.responseBuffer)
        .replace(/\r/g, "")
        .trim();
      if (partial) {
        workSessionService
          .updateMessageProgress(messageId, partial)
          .catch(() => {});
      }
    }
  }, 5_000);

  // Log progress every 30 seconds
  const logInterval = setInterval(() => {
    const elapsed = Math.round((Date.now() - start) / 1000);
    const bufLen = ptySession.responseBuffer.length;
    console.log(
      `[C.O.D.E.] [${elapsed}s] Interactive session in progress — responseBuffer: ${bufLen} chars`
    );
  }, 30_000);

  try {
    // Send prompt to the TUI and collect the response
    const { result, sessionId: extractedSessionId } =
      await inputManager.sendPrompt(
        ptySession,
        prompt,
        WORKER_EXECUTION_TIMEOUT
      );

    clearInterval(progressInterval);
    clearInterval(logInterval);

    // Gracefully exit session and extract the Claude session ID
    const exitSessionId = await inputManager.exitSession(ptySession);
    const sessionId = extractedSessionId || exitSessionId;

    const duration = Date.now() - start;
    const output = result || "[No output]";
    const summary = output.length > 500 ? output.slice(0, 500) : output;

    console.log(
      `[C.O.D.E.] Interactive session completed (${Math.round(duration / 1000)}s, ${output.length} chars, sessionId=${sessionId || "none"})`
    );

    return { summary, output, sessionId, duration };
  } catch (error) {
    clearInterval(progressInterval);
    clearInterval(logInterval);
    inputManager.kill(ptySession);
    throw error;
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
