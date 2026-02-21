import { prisma } from "@atlas/database";
import { hashApiKey } from "@atlas/shared";

export class AgentService {
  async list(filters?: { status?: "ONLINE" | "OFFLINE" | "ERROR" | "PROCESSING" }) {
    return prisma.agent.findMany({
      where: filters?.status ? { status: filters.status } : undefined,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        rateLimit: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true,
        apiKeyPrefix: true,
      },
    });
  }

  async get(id: string) {
    return prisma.agent.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        rateLimit: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true,
        apiKeyPrefix: true,
      },
    });
  }

  async updateStatus(id: string, status: "ONLINE" | "OFFLINE" | "ERROR" | "PROCESSING") {
    return prisma.agent.update({
      where: { id },
      data: { status, lastActiveAt: new Date() },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        lastActiveAt: true,
      },
    });
  }

  async authenticateByApiKey(apiKey: string) {
    const hash = hashApiKey(apiKey);
    const agent = await prisma.agent.findUnique({
      where: { apiKeyHash: hash },
    });
    if (!agent) return null;

    await prisma.agent.update({
      where: { id: agent.id },
      data: { lastActiveAt: new Date() },
    });

    return agent;
  }

  async whoami(agentId: string) {
    return prisma.agent.findUniqueOrThrow({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        rateLimit: true,
        lastActiveAt: true,
      },
    });
  }
}
