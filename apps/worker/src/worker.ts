import { prisma } from "@atlas/database";
import { WorkSessionService, AgentService } from "@atlas/services";
import { WORKER_POLL_INTERVAL_MS, WORKER_AGENT_SLUG } from "@atlas/shared";
import { InputManager, type Session } from "./input-manager.js";
import { executeMessage } from "./executor.js";
import { Notifier } from "./notifier.js";

const workSessionService = new WorkSessionService();
const agentService = new AgentService();
const inputManager = new InputManager();

let workerId: string;
let running = true;
let workerSession: Session | null = null;

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
  ║   Interactive TUI + Remote Control               ║
  ║                                                  ║
  ║   Poll interval: ${String(WORKER_POLL_INTERVAL_MS).padEnd(5)}ms                    ║
  ║   Worker ID: ${workerId}              ║
  ╚══════════════════════════════════════════════════╝
  `);
}

/**
 * Spawn the single interactive Claude TUI session.
 * Remote Control activates automatically (remoteControlAtStartup=true).
 * ALL work executes in this session so Remote Control can monitor it.
 */
async function spawnWorkerSession(): Promise<Session> {
  console.log("[C.O.D.E.] Spawning interactive TUI session...");
  console.log("[C.O.D.E.] (remoteControlAtStartup=true — Remote Control will auto-activate)");

  const session = await inputManager.spawnSession({ cwd: "/tmp" });

  console.log(`[C.O.D.E.] TUI session ${session.id} ready — Remote Control should be active`);

  return session;
}

/**
 * Ensure the worker session is alive. Respawn if it died.
 */
async function ensureSession(): Promise<Session> {
  if (workerSession) {
    // Check if PTY is still alive by testing if we can access it
    try {
      // node-pty processes don't have a simple "alive" check,
      // but if the session was removed from InputManager on exit, it's gone
      // We rely on the onExit handler setting workerSession = null
      return workerSession;
    } catch {
      workerSession = null;
    }
  }

  console.log("[C.O.D.E.] Worker session not available — spawning new one...");
  workerSession = await spawnWorkerSession();

  // Watch for unexpected exit
  workerSession.pty.onExit(({ exitCode, signal }) => {
    console.warn(`[C.O.D.E.] Worker TUI session exited unexpectedly (code=${exitCode}, signal=${signal})`);
    workerSession = null;
  });

  return workerSession;
}

async function pollLoop() {
  // Spawn the initial worker session before entering the poll loop
  await ensureSession();

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
          // Ensure TUI session is alive
          const ptySession = await ensureSession();

          const result = await executeMessage(
            inputManager,
            ptySession,
            message,
            session,
            notifier,
            message.id,
            workSessionService
          );

          // Complete the message
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

          // If the session died during execution, it'll be respawned on next poll
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
  inputManager.killAll();
  if (workerId) {
    await agentService.updateStatus(workerId, "OFFLINE").catch(() => {});
  }
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

initialize()
  .then(() => pollLoop())
  .catch((err) => {
    console.error("[C.O.D.E.] Fatal error:", err);
    process.exit(1);
  });
