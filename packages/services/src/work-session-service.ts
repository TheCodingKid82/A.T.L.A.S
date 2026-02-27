import { prisma } from "@atlas/database";
import type { Prisma } from "@atlas/database";

const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export class WorkSessionService {
  async createSession(data: {
    requesterId: string;
    type?: "CODE" | "RESEARCH" | "GITHUB" | "BROWSER" | "GENERAL";
    title: string;
    instructions: string;
    priority?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    workingDirectory?: string;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.workSession.create({
      data: {
        requesterId: data.requesterId,
        type: data.type ?? "GENERAL",
        title: data.title,
        priority: data.priority ?? "MEDIUM",
        workingDirectory: data.workingDirectory,
        metadata: data.metadata as Prisma.InputJsonValue,
        messages: {
          create: {
            role: "USER",
            content: data.instructions,
            status: "PENDING",
          },
        },
      },
      include: { requester: true, messages: true },
    });
  }

  async addMessage(sessionId: string, content: string, requesterId: string) {
    const session = await prisma.workSession.findUniqueOrThrow({
      where: { id: sessionId },
    });

    if (session.requesterId !== requesterId) {
      throw new Error("Only the session owner can send messages");
    }
    if (session.status !== "ACTIVE" && session.status !== "COMPLETED") {
      throw new Error(`Cannot send messages to a ${session.status} session`);
    }

    // Re-open completed sessions for continuation
    if (session.status === "COMPLETED") {
      await prisma.workSession.update({
        where: { id: sessionId },
        data: { status: "ACTIVE" },
      });
    }

    return prisma.workMessage.create({
      data: {
        sessionId,
        role: "USER",
        content,
        status: "PENDING",
      },
      include: { session: true },
    });
  }

  async getSession(id: string) {
    return prisma.workSession.findUniqueOrThrow({
      where: { id },
      include: {
        requester: true,
        worker: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
  }

  async listSessions(filters?: {
    status?: "ACTIVE" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELLED";
    requesterId?: string;
    type?: "CODE" | "RESEARCH" | "GITHUB" | "BROWSER" | "GENERAL";
    limit?: number;
  }) {
    const where: Prisma.WorkSessionWhereInput = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.requesterId) where.requesterId = filters.requesterId;
    if (filters?.type) where.type = filters.type;

    return prisma.workSession.findMany({
      where,
      include: {
        requester: true,
        worker: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
      take: filters?.limit ?? 20,
    });
  }

  async closeSession(id: string, requesterId: string) {
    const session = await prisma.workSession.findUniqueOrThrow({ where: { id } });

    if (session.requesterId !== requesterId) {
      throw new Error("Only the session owner can close a session");
    }
    if (session.status !== "ACTIVE" && session.status !== "PAUSED") {
      throw new Error(`Cannot close a session with status ${session.status}`);
    }

    return prisma.workSession.update({
      where: { id },
      data: { status: "COMPLETED" },
      include: { requester: true },
    });
  }

  async cancelSession(id: string, requesterId: string) {
    const session = await prisma.workSession.findUniqueOrThrow({ where: { id } });

    if (session.requesterId !== requesterId) {
      throw new Error("Only the session owner can cancel a session");
    }
    if (session.status !== "ACTIVE" && session.status !== "PAUSED") {
      throw new Error(`Cannot cancel a session with status ${session.status}`);
    }

    return prisma.workSession.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: { requester: true },
    });
  }

  async claimNextMessage(workerId: string) {
    // Find oldest PENDING message in any ACTIVE session
    const pendingMessages = await prisma.workMessage.findMany({
      where: {
        status: "PENDING",
        role: "USER",
        session: { status: "ACTIVE" },
      },
      include: { session: true },
      orderBy: { createdAt: "asc" },
    });

    if (pendingMessages.length === 0) return null;

    // Sort by session priority then by message creation time
    pendingMessages.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.session.priority] ?? 2;
      const pb = PRIORITY_ORDER[b.session.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const next = pendingMessages[0];

    // Optimistic lock: only update if still PENDING
    try {
      const message = await prisma.workMessage.update({
        where: { id: next.id, status: "PENDING" },
        data: { status: "PROCESSING" },
        include: {
          session: {
            include: { requester: true },
          },
        },
      });

      // Set session's workerId if not already set
      if (!message.session.workerId) {
        await prisma.workSession.update({
          where: { id: message.sessionId },
          data: { workerId },
        });
      }

      return message;
    } catch {
      return null;
    }
  }

  async completeMessage(messageId: string, result: unknown, claudeSessionId?: string) {
    const message = await prisma.workMessage.findUniqueOrThrow({
      where: { id: messageId },
    });

    const startTime = message.createdAt.getTime();
    const duration = Date.now() - startTime;

    const updated = await prisma.workMessage.update({
      where: { id: messageId },
      data: {
        status: "COMPLETED",
        result: result as Prisma.InputJsonValue,
        duration,
      },
      include: { session: { include: { requester: true } } },
    });

    // Update session: store claudeSessionId and mark COMPLETED
    // (if user sends atlas_work_continue later, addMessage re-opens to ACTIVE)
    const sessionUpdate: Prisma.WorkSessionUpdateInput = { status: "COMPLETED" };
    if (claudeSessionId) {
      sessionUpdate.claudeSessionId = claudeSessionId;
    }
    await prisma.workSession.update({
      where: { id: updated.sessionId },
      data: sessionUpdate,
    });

    return updated;
  }

  async failMessage(messageId: string, errorMessage: string) {
    const updated = await prisma.workMessage.update({
      where: { id: messageId },
      data: {
        status: "FAILED",
        errorMessage,
      },
      include: { session: { include: { requester: true } } },
    });

    // Mark session as FAILED
    await prisma.workSession.update({
      where: { id: updated.sessionId },
      data: { status: "FAILED" },
    });

    return updated;
  }

  /** Fix stale ACTIVE sessions whose messages are all done. */
  async cleanupStaleSessions() {
    const activeSessions = await prisma.workSession.findMany({
      where: { status: "ACTIVE" },
      include: { messages: true },
    });

    let completed = 0;
    let failed = 0;

    for (const session of activeSessions) {
      if (session.messages.length === 0) continue;

      const hasPending = session.messages.some(
        (m) => m.status === "PENDING" || m.status === "PROCESSING"
      );
      if (hasPending) continue;

      const hasFailed = session.messages.some((m) => m.status === "FAILED");
      const newStatus = hasFailed ? "FAILED" : "COMPLETED";

      await prisma.workSession.update({
        where: { id: session.id },
        data: { status: newStatus },
      });

      if (hasFailed) failed++;
      else completed++;
    }

    return { completed, failed, total: completed + failed };
  }
}
