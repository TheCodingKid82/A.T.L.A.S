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
    if (session.status !== "ACTIVE") {
      throw new Error(`Cannot send messages to a ${session.status} session`);
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

    // Update session's claudeSessionId if provided
    if (claudeSessionId) {
      await prisma.workSession.update({
        where: { id: updated.sessionId },
        data: { claudeSessionId },
      });
    }

    return updated;
  }

  async failMessage(messageId: string, errorMessage: string) {
    return prisma.workMessage.update({
      where: { id: messageId },
      data: {
        status: "FAILED",
        errorMessage,
      },
      include: { session: { include: { requester: true } } },
    });
  }
}
