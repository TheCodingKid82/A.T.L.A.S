import { prisma } from "@atlas/database";
import { WorkSessionService, AgentService } from "@atlas/services";
import { WORKER_POLL_INTERVAL_MS, WORKER_AGENT_SLUG } from "@atlas/shared";
import { executeMessage } from "./executor.js";
import { Notifier } from "./notifier.js";
import * as pty from "node-pty";

const workSessionService = new WorkSessionService();
const agentService = new AgentService();

let workerId: string;
let running = true;
let controlPty: pty.IPty | null = null;

// eslint-disable-next-line no-control-regex
const ANSI_RE = /[\u001B\u009B][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d\/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;

function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}

/** Build env without CLAUDECODE and ANTHROPIC_API_KEY (conflicts with OAuth). */
function cleanEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (k !== "CLAUDECODE" && k !== "ANTHROPIC_API_KEY" && v !== undefined) {
      env[k] = v;
    }
  }
  return env;
}

async function initialize() {
  const worker = await prisma.agent.findUnique({
    where: { slug: WORKER_AGENT_SLUG },
  });

  if (!worker) {
    throw new Error("C.O.D.E. worker agent not found in database. Run pnpm db:seed first.");
  }

  workerId = worker.id;

  await agentService.updateStatus(workerId, "ONLINE");

  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║       A.T.L.A.S. Worker — C.O.D.E.              ║
  ║                                                  ║
  ║   Claude Orchestrated Development Engine         ║
  ║   Interactive CLI mode (PTY)                     ║
  ║                                                  ║
  ║   Poll interval: ${String(WORKER_POLL_INTERVAL_MS).padEnd(5)}ms                    ║
  ║   Worker ID: ${workerId}              ║
  ╚══════════════════════════════════════════════════╝
  `);
}

/**
 * Spawn an interactive Claude TUI session in a PTY.
 * Remote Control activates automatically via remoteControlAtStartup=true
 * in ~/.claude.json (configured by entrypoint.sh). No input needed.
 * Auto-restarts on exit.
 */
function startControlSession() {
  try {
    console.log("[C.O.D.E.] Spawning interactive Claude session for Remote Control...");
    console.log("[C.O.D.E.] (remoteControlAtStartup=true — no manual /remote-control needed)");

    const proc = pty.spawn("claude", ["--dangerously-skip-permissions"], {
      name: "xterm-256color",
      cols: 200,
      rows: 50,
      cwd: "/tmp",
      env: cleanEnv(),
    });

    proc.onData((data: string) => {
      const clean = stripAnsi(data).replace(/\r/g, "").trim();
      if (clean) {
        for (const line of clean.split("\n")) {
          const trimmed = line.trim();
          if (trimmed && trimmed.length > 1) {
            console.log(`[C.O.D.E.] RC | ${trimmed.slice(0, 500)}`);
          }
        }
      }
    });

    proc.onExit(({ exitCode, signal }) => {
      console.warn(`[C.O.D.E.] Remote Control session exited (code=${exitCode}, signal=${signal})`);
      controlPty = null;
      if (running) {
        console.log("[C.O.D.E.] Restarting Remote Control in 10s...");
        setTimeout(() => startControlSession(), 10_000);
      }
    });

    controlPty = proc;
  } catch (error) {
    console.error("[C.O.D.E.] Failed to start Remote Control:", error);
    if (running) {
      console.log("[C.O.D.E.] Will retry in 30s...");
      setTimeout(() => startControlSession(), 30_000);
    }
  }
}

async function pollLoop() {
  while (running) {
    try {
      const message = await workSessionService.claimNextMessage(workerId);

      if (message) {
        const session = message.session;
        const isResume = !!session.claudeSessionId;

        console.log(`[C.O.D.E.] Claimed message ${message.id} in session "${session.title}" (${isResume ? "resume" : "new"})`);

        await agentService.updateStatus(workerId, "PROCESSING");

        const notifier = new Notifier(workerId, session.requesterId);

        const modeLabel = isResume ? "follow-up in" : "new message for";
        await notifier.send(
          `Processing ${modeLabel} session: **${session.title}**\nSession ID: \`${session.id}\``,
          "HIGH"
        );

        try {
          const result = await executeMessage(message, session, notifier, message.id, workSessionService);

          // Complete the message and update session's claudeSessionId
          await workSessionService.completeMessage(
            message.id,
            result.output,
            result.sessionId ?? undefined
          );

          await notifier.send(
            `Completed: **${session.title}**\nSession: \`${session.id}\`\nDuration: ${Math.round(result.duration / 1000)}s\n\n${result.summary}`,
            "NORMAL"
          );

          console.log(`[C.O.D.E.] Completed message ${message.id} (${Math.round(result.duration / 1000)}s)`);
        } catch (error: unknown) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          console.error(`[C.O.D.E.] Failed message ${message.id}:`, errorMsg);

          await workSessionService.failMessage(message.id, errorMsg);

          await notifier.send(
            `Failed: **${session.title}**\nSession: \`${session.id}\`\nError: ${errorMsg}`,
            "URGENT"
          );
        }

        await agentService.updateStatus(workerId, "ONLINE");
      }
    } catch (error) {
      console.error("[C.O.D.E.] Poll loop error:", error);
    }

    await new Promise((resolve) => setTimeout(resolve, WORKER_POLL_INTERVAL_MS));
  }
}

async function shutdown() {
  console.log("[C.O.D.E.] Shutting down...");
  running = false;
  if (controlPty) {
    try { controlPty.kill(); } catch {}
    controlPty = null;
  }
  if (workerId) {
    await agentService.updateStatus(workerId, "OFFLINE").catch(() => {});
  }
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

initialize()
  .then(() => {
    startControlSession();
    return pollLoop();
  })
  .catch((err) => {
    console.error("[C.O.D.E.] Fatal error:", err);
    process.exit(1);
  });
