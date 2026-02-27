import { prisma } from "@atlas/database";
import { WorkSessionService, AgentService } from "@atlas/services";
import { WORKER_POLL_INTERVAL_MS, WORKER_AGENT_SLUG } from "@atlas/shared";
import { executeMessage } from "./executor.js";
import { Notifier } from "./notifier.js";

const workSessionService = new WorkSessionService();
const agentService = new AgentService();

let workerId: string;
let running = true;

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
  ║   Session-based worker (v2)                      ║
  ║                                                  ║
  ║   Poll interval: ${String(WORKER_POLL_INTERVAL_MS).padEnd(5)}ms                    ║
  ║   Worker ID: ${workerId}              ║
  ╚══════════════════════════════════════════════════╝
  `);
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
          const result = await executeMessage(message, session, notifier);

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
