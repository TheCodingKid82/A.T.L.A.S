import { WORKER_EXECUTION_TIMEOUT } from "@atlas/shared";
import type { InputManager } from "./input-manager.js";
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

export async function executeMessage(
  message: WorkMessage,
  session: WorkSession,
  inputManager: InputManager,
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
    `${mode} — spawning interactive Claude CLI...`,
    "NORMAL"
  );

  console.log(
    `[C.O.D.E.] Spawning CLI session: ${session.claudeSessionId ? "resume " + session.claudeSessionId : "(new)"}, cwd=${cwd}`
  );

  const cliSession = await inputManager.spawnSession({
    cwd,
    resume: session.claudeSessionId || undefined,
    model: "claude-opus-4-6",
  });

  try {
    const { result, sessionId: promptSessionId } = await inputManager.sendPrompt(
      cliSession,
      prompt,
      WORKER_EXECUTION_TIMEOUT
    );

    // Gracefully exit to capture session ID from --resume output
    const exitSessionId = await inputManager.exitSession(cliSession);
    const sessionId = exitSessionId || promptSessionId;

    const duration = Date.now() - start;
    const summary = result.length > 500 ? result.slice(0, 500) : result;

    return { summary, output: result, sessionId, duration };
  } catch (err) {
    inputManager.kill(cliSession);
    throw err;
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
