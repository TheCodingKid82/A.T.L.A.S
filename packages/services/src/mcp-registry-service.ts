import { prisma } from "@atlas/database";

export class McpRegistryService {
  async list() {
    return prisma.mcpConnection.findMany({
      include: {
        permissions: {
          include: { agent: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async get(id: string) {
    return prisma.mcpConnection.findUniqueOrThrow({
      where: { id },
      include: {
        permissions: {
          include: { agent: true },
        },
      },
    });
  }

  async healthCheck(id: string) {
    const mcp = await prisma.mcpConnection.findUniqueOrThrow({
      where: { id },
    });

    let status: "HEALTHY" | "UNHEALTHY" = "UNHEALTHY";
    try {
      const res = await fetch(mcp.url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
      status = res.ok ? "HEALTHY" : "UNHEALTHY";
    } catch {
      status = "UNHEALTHY";
    }

    return prisma.mcpConnection.update({
      where: { id },
      data: { status, lastHealthCheck: new Date() },
    });
  }

  async register(data: {
    name: string;
    url: string;
    transport?: string;
    metadata?: unknown;
  }) {
    return prisma.mcpConnection.create({
      data: {
        name: data.name,
        url: data.url,
        transport: data.transport ?? "streamable-http",
        metadata: data.metadata as any,
      },
    });
  }

  async setPermission(mcpConnectionId: string, agentId: string, allowedTools: string[]) {
    return prisma.mcpPermission.upsert({
      where: { mcpConnectionId_agentId: { mcpConnectionId, agentId } },
      create: { mcpConnectionId, agentId, allowedTools },
      update: { allowedTools },
    });
  }
}
