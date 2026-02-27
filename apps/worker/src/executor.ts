import { query } from "@anthropic-ai/claude-agent-sdk";
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

export async function executeMessage(
  message: WorkMessage,
  session: WorkSession,
  notifier: Notifier
): Promise<ExecutionResult> {
  const start = Date.now();

  const prompt = await buildPrompt(message, session);
  const cwd = session.workingDirectory || process.env.DEFAULT_WORKING_DIR || "/tmp";

  // Build MCP server config for programmatic connection
  const mcpServers: Record<string, unknown> = {};
  if (process.env.ATLAS_MCP_URL && process.env.WORKER_API_KEY) {
    mcpServers.atlas = {
      type: "http",
      url: process.env.ATLAS_MCP_URL,
      headers: { Authorization: `Bearer ${process.env.WORKER_API_KEY}` },
    };
  }
  if (process.env.ZAPIER_MCP_TOKEN) {
    mcpServers.zapier = {
      type: "http",
      url: "https://mcp.zapier.com/api/v1/connect",
      headers: { Authorization: `Bearer ${process.env.ZAPIER_MCP_TOKEN}` },
    };
  }

  // Exclude ANTHROPIC_API_KEY — we use OAuth credentials
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;

  const mode = session.claudeSessionId ? "Resuming session" : "Starting new session";
  await notifier.send(`${mode} — executing with Claude Agent SDK...`, "NORMAL");

  console.error(`[C.O.D.E.] SDK query: ${session.claudeSessionId ? "resume " + session.claudeSessionId : "(new session)"}, cwd=${cwd}, mcpServers=[${Object.keys(mcpServers).join(", ")}]`);

  // Abort controller for timeout
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), WORKER_EXECUTION_TIMEOUT);

  let sessionId: string | null = null;
  let resultText: string | null = null;
  let resultOutput: unknown = null;

  try {
    const conversation = query({
      prompt,
      options: {
        cwd,
        model: "claude-opus-4-6",
        mcpServers,
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        settingSources: ["user"],
        env,
        abortController,
        stderr: (data: string) => {
          console.error(`[C.O.D.E.] SDK stderr: ${data.trim()}`);
        },
        ...(session.claudeSessionId ? { resume: session.claudeSessionId } : {}),
      },
    });

    for await (const event of conversation) {
      const e = event as Record<string, unknown>;
      console.error(`[C.O.D.E.] SDK event: type=${e.type}, subtype=${e.subtype ?? ""}, hasResult=${"result" in event}`);

      // Capture session ID from init message
      if (e.type === "system" && e.subtype === "init") {
        sessionId = e.session_id as string ?? null;
        console.error(`[C.O.D.E.] Session ID: ${sessionId}`);
      }

      // Capture result
      if ("result" in event) {
        resultText = e.result as string ?? null;
        resultOutput = event;
        console.error(`[C.O.D.E.] SDK result (${(resultText ?? "").length} chars): ${(resultText ?? "").slice(0, 200)}`);
      }
    }
    console.error(`[C.O.D.E.] SDK conversation ended. resultText=${resultText !== null}, sessionId=${sessionId}`);
  } catch (err: unknown) {
    if (abortController.signal.aborted) {
      throw new Error(`Execution timed out after ${WORKER_EXECUTION_TIMEOUT / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  const duration = Date.now() - start;

  if (!resultText) {
    throw new Error("Claude Agent SDK returned no result. Check OAuth credentials and CLI version.");
  }

  const summary = resultText.length > 500 ? resultText.slice(0, 500) : resultText;

  return { summary, output: resultOutput, sessionId, duration };
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
