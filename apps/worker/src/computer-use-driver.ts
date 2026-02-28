import Anthropic from "@anthropic-ai/sdk";
import { execSync, spawn, type ChildProcess } from "child_process";
import { readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import type { WorkSessionService } from "@atlas/services";
import type { Notifier } from "./notifier.js";
import type { ExecutionResult } from "./executor.js";

// ── Constants ──────────────────────────────────────────────
const MAX_ITERATIONS = 200;
const SCREENSHOT_DELAY_MS = 1000;
const PROGRESS_INTERVAL_MS = 10_000;
const TERMINAL_STARTUP_MS = 3000;
const MODEL = "claude-sonnet-4-20250514";
const DISPLAY_WIDTH = parseInt(process.env.DISPLAY_WIDTH || "1024", 10);
const DISPLAY_HEIGHT = parseInt(process.env.DISPLAY_HEIGHT || "768", 10);

const SYSTEM_PROMPT = `You are controlling a terminal running Claude Code CLI. Your job is to use the terminal to complete the given task.

## Terminal State Indicators
- The \`❯\` prompt means the CLI is idle and ready for input
- \`⏺\` markers indicate the CLI is actively processing
- When the CLI finishes a task, it returns to the \`❯\` prompt
- Blue highlighted text indicates tool usage or file operations

## How to Work
1. The task has already been typed and submitted in the terminal
2. Watch the terminal output by taking screenshots frequently
3. Wait for the CLI to finish processing (look for the \`❯\` prompt to return)
4. If the CLI asks a question or needs confirmation, type the appropriate response
5. If the terminal seems stuck, try pressing Enter or taking a screenshot to check
6. When the task is complete (you see the final \`❯\` prompt and a summary), respond with your final text summary

## Important
- Take screenshots frequently to monitor progress (every few seconds during active processing)
- Do NOT type while the CLI is actively processing (showing \`⏺\` markers)
- Only type when you see the \`❯\` prompt indicating the CLI is ready
- If you see an error, report it in your text response
- When the task is done, provide a clear summary of what was accomplished`;

// ── Screenshot ─────────────────────────────────────────────
function takeScreenshot(): string {
  const tmpPath = join(tmpdir(), `screenshot-${Date.now()}.png`);
  try {
    execSync(`scrot -o ${tmpPath}`, {
      env: { ...process.env, DISPLAY: process.env.DISPLAY || ":1" },
      timeout: 5000,
    });
    const data = readFileSync(tmpPath);
    return data.toString("base64");
  } finally {
    try {
      unlinkSync(tmpPath);
    } catch {}
  }
}

// ── Action Execution ───────────────────────────────────────
interface ComputerAction {
  type: "computer_20250124";
  action: string;
  coordinate?: [number, number];
  text?: string;
  scroll_direction?: "up" | "down" | "left" | "right";
  scroll_amount?: number;
  duration?: number;
  start_coordinate?: [number, number];
}

function xdotool(args: string): void {
  execSync(`xdotool ${args}`, {
    env: { ...process.env, DISPLAY: process.env.DISPLAY || ":1" },
    timeout: 5000,
  });
}

function executeAction(action: ComputerAction): void {
  const [x, y] = action.coordinate ?? [0, 0];

  switch (action.action) {
    case "screenshot":
      // No-op — screenshot is taken after every action
      break;

    case "left_click":
      xdotool(`mousemove --sync ${x} ${y} click 1`);
      break;

    case "right_click":
      xdotool(`mousemove --sync ${x} ${y} click 3`);
      break;

    case "double_click":
      xdotool(`mousemove --sync ${x} ${y} click --repeat 2 --delay 100 1`);
      break;

    case "middle_click":
      xdotool(`mousemove --sync ${x} ${y} click 2`);
      break;

    case "type": {
      const text = action.text ?? "";
      // Use xdotool type with delay for reliable input
      xdotool(`type --delay 12 -- ${JSON.stringify(text)}`);
      break;
    }

    case "key": {
      const key = action.text ?? "";
      xdotool(`key -- ${key}`);
      break;
    }

    case "scroll": {
      const dir = action.scroll_direction ?? "down";
      const amount = action.scroll_amount ?? 3;
      // xdotool: button 4=up, 5=down, 6=left, 7=right
      const buttonMap: Record<string, number> = {
        up: 4,
        down: 5,
        left: 6,
        right: 7,
      };
      const button = buttonMap[dir] ?? 5;
      if (action.coordinate) {
        xdotool(`mousemove --sync ${x} ${y}`);
      }
      for (let i = 0; i < amount; i++) {
        xdotool(`click ${button}`);
      }
      break;
    }

    case "mouse_move":
      xdotool(`mousemove --sync ${x} ${y}`);
      break;

    case "left_click_drag": {
      const [startX, startY] = action.start_coordinate ?? action.coordinate ?? [0, 0];
      xdotool(`mousemove --sync ${startX} ${startY} mousedown 1 mousemove --sync ${x} ${y} mouseup 1`);
      break;
    }

    default:
      console.warn(`[computer-use] Unknown action: ${action.action}`);
  }
}

// ── Terminal Launch ────────────────────────────────────────
function launchClaudeInTerminal(
  prompt: string,
  claudeSessionId: string | null,
  cwd: string
): ChildProcess {
  const claudeArgs = ["--dangerously-skip-permissions"];
  if (claudeSessionId) {
    claudeArgs.push("--resume", claudeSessionId);
  }

  // Build the command that runs inside xterm
  // We pipe the prompt via stdin using a heredoc approach
  const escapedPrompt = prompt.replace(/'/g, "'\\''");
  const claudeCmd = claudeSessionId
    ? `cd ${cwd} && echo '${escapedPrompt}' | claude ${claudeArgs.join(" ")}`
    : `cd ${cwd} && echo '${escapedPrompt}' | claude ${claudeArgs.join(" ")}`;

  const xtermArgs = [
    "-maximized",
    "-fa", "DejaVu Sans Mono",
    "-fs", "11",
    "-bg", "black",
    "-fg", "white",
    "-e", `bash -c ${JSON.stringify(claudeCmd)}`,
  ];

  console.log(`[computer-use] Launching xterm: claude ${claudeArgs.join(" ")} (cwd=${cwd})`);

  const proc = spawn("xterm", xtermArgs, {
    env: {
      ...process.env,
      DISPLAY: process.env.DISPLAY || ":1",
      // Exclude ANTHROPIC_API_KEY from the CLI spawn
      ANTHROPIC_API_KEY: undefined as unknown as string,
    },
    detached: true,
    stdio: "ignore",
  });

  proc.unref();
  return proc;
}

// ── Clean env for CLI (exclude ANTHROPIC_API_KEY) ──────────
function cleanEnvForCli(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (k !== "CLAUDECODE" && k !== "ANTHROPIC_API_KEY" && v !== undefined) {
      env[k] = v;
    }
  }
  return env;
}

// ── Main Computer-Use Loop ─────────────────────────────────
export async function executeWithComputerUse(
  message: { id: string; content: string },
  session: {
    id: string;
    type: string;
    title: string;
    priority: string;
    workingDirectory: string | null;
    metadata: unknown;
    requesterId: string;
    claudeSessionId: string | null;
  },
  notifier: Notifier,
  messageId: string,
  workSessionService: WorkSessionService
): Promise<ExecutionResult> {
  const start = Date.now();
  const cwd = session.workingDirectory || process.env.DEFAULT_WORKING_DIR || "/tmp";

  const anthropic = new Anthropic();

  // Build prompt (reuse logic from executor for first message)
  const prompt = session.claudeSessionId
    ? message.content
    : buildComputerUsePrompt(message, session);

  const mode = session.claudeSessionId ? "Resuming" : "Starting new";
  await notifier.send(
    `${mode} session (computer-use mode) — launching terminal...`,
    "NORMAL"
  );

  // 1. Launch Claude Code in xterm
  const xtermProc = launchClaudeInTerminal(prompt, session.claudeSessionId, cwd);
  console.log(`[computer-use] xterm launched (pid=${xtermProc.pid})`);

  // 2. Wait for terminal to render
  await sleep(TERMINAL_STARTUP_MS);

  let actionLog: string[] = [];
  let lastProgressWrite = Date.now();
  let finalText = "";

  try {
    // 3. Take initial screenshot
    let screenshotBase64 = takeScreenshot();

    // 4. Send to Anthropic API with computer_20250124 tool
    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Complete this task by watching and interacting with the Claude Code CLI terminal:\n\n${prompt}`,
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: screenshotBase64,
            },
          },
        ],
      },
    ];

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const elapsed = Math.round((Date.now() - start) / 1000);
      console.log(`[computer-use] Iteration ${iteration + 1}/${MAX_ITERATIONS} (${elapsed}s elapsed)`);

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: [
          {
            type: "computer_20250124",
            name: "computer",
            display_width_px: DISPLAY_WIDTH,
            display_height_px: DISPLAY_HEIGHT,
            display_number: 1,
          },
        ],
        messages,
      });

      // Check if the response contains only text (task complete)
      const hasToolUse = response.content.some((block) => block.type === "tool_use");
      const textBlocks = response.content.filter((block) => block.type === "text");

      if (!hasToolUse) {
        // Task complete — extract final summary
        finalText = textBlocks
          .map((b) => (b as Anthropic.TextBlock).text)
          .join("\n");
        console.log(`[computer-use] Task complete after ${iteration + 1} iterations`);
        actionLog.push(`[${elapsed}s] Task complete`);
        break;
      }

      // Process each content block
      const assistantContent: Anthropic.ContentBlockParam[] = [];
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "text") {
          assistantContent.push({ type: "text", text: block.text });
          actionLog.push(`[${elapsed}s] Model: ${block.text.slice(0, 100)}`);
        } else if (block.type === "tool_use") {
          assistantContent.push({
            type: "tool_use",
            id: block.id,
            name: block.name,
            input: block.input,
          });

          const action = block.input as unknown as ComputerAction;
          const actionDesc = `${action.action}${action.coordinate ? ` at (${action.coordinate.join(",")})` : ""}${action.text ? ` "${action.text.slice(0, 50)}"` : ""}`;
          console.log(`[computer-use] Action: ${actionDesc}`);
          actionLog.push(`[${elapsed}s] ${actionDesc}`);

          // Execute the action
          if (action.action !== "screenshot") {
            try {
              executeAction(action);
            } catch (err) {
              console.error(`[computer-use] Action failed:`, err);
              actionLog.push(`[${elapsed}s] ERROR: ${err}`);
            }
          }

          // Wait and take screenshot
          await sleep(action.action === "screenshot" ? 300 : SCREENSHOT_DELAY_MS);
          screenshotBase64 = takeScreenshot();

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: screenshotBase64,
                },
              },
            ],
          });
        }
      }

      // Add assistant message and tool results to conversation
      messages.push({ role: "assistant", content: assistantContent });
      messages.push({ role: "user", content: toolResults });

      // Write progress to DB periodically
      const now = Date.now();
      if (now - lastProgressWrite >= PROGRESS_INTERVAL_MS) {
        lastProgressWrite = now;
        const progressText = actionLog.join("\n");
        await workSessionService
          .updateMessageProgress(messageId, progressText)
          .catch(() => {});
      }

      // Check if xterm is still running
      if (xtermProc.killed || xtermProc.exitCode !== null) {
        console.log(`[computer-use] xterm exited (code=${xtermProc.exitCode})`);
        // Take final screenshot and let the model summarize
        screenshotBase64 = takeScreenshot();
        messages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: "The terminal process has exited. Please provide a summary of what happened.",
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: screenshotBase64,
              },
            },
          ],
        });
      }
    }
  } finally {
    // Kill xterm process
    try {
      if (xtermProc.pid && !xtermProc.killed) {
        process.kill(-xtermProc.pid, "SIGTERM");
        setTimeout(() => {
          try {
            process.kill(-xtermProc.pid!, "SIGKILL");
          } catch {}
        }, 3000);
      }
    } catch {}
  }

  const duration = Date.now() - start;
  const output = finalText || actionLog.join("\n") || "[No output captured]";
  const summary =
    finalText.length > 500 ? finalText.slice(0, 500) : finalText || "Computer-use session completed";

  return {
    summary,
    output,
    sessionId: null, // computer-use mode doesn't capture CLI session IDs
    duration,
  };
}

// ── Helpers ────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildComputerUsePrompt(
  message: { content: string },
  session: {
    title: string;
    type: string;
    priority: string;
    requesterId: string;
    metadata: unknown;
  }
): string {
  const metadataStr = session.metadata
    ? `\n\nAdditional context:\n${JSON.stringify(session.metadata, null, 2)}`
    : "";

  return `You are C.O.D.E. (Claude Orchestrated Development Engine), a worker agent in the A.T.L.A.S. system.

**Title:** ${session.title}
**Type:** ${session.type}
**Priority:** ${session.priority}

**Instructions:**
${message.content}
${metadataStr}

Execute this work request thoroughly. Always commit and push to main. Provide a clear summary when done.`;
}

/** Check if the display stack is available */
export function isDisplayAvailable(): boolean {
  try {
    execSync("xdotool getdisplaygeometry", {
      env: { ...process.env, DISPLAY: process.env.DISPLAY || ":1" },
      timeout: 3000,
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}
