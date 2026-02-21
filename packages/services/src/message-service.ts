import { prisma } from "@atlas/database";

export class MessageService {
  async send(data: {
    channelId: string;
    senderId: string;
    content: string;
    priority?: "URGENT" | "HIGH" | "NORMAL" | "LOW";
    threadId?: string;
    structuredData?: unknown;
  }) {
    return prisma.message.create({
      data: {
        channelId: data.channelId,
        senderId: data.senderId,
        content: data.content,
        priority: data.priority ?? "NORMAL",
        threadId: data.threadId,
        structuredData: data.structuredData as any,
      },
      include: { sender: true, channel: true },
    });
  }

  async sendDirect(data: {
    senderId: string;
    targetAgentId: string;
    content: string;
    priority?: "URGENT" | "HIGH" | "NORMAL" | "LOW";
    structuredData?: unknown;
  }) {
    // Find existing DM channel between the two agents
    const dmChannel = await prisma.channel.findFirst({
      where: {
        type: "DIRECT",
        AND: [
          { members: { some: { agentId: data.senderId } } },
          { members: { some: { agentId: data.targetAgentId } } },
        ],
      },
    });

    if (!dmChannel) {
      // Create a new DM channel
      const channel = await prisma.channel.create({
        data: {
          name: `dm-${Date.now()}`,
          type: "DIRECT",
          members: {
            create: [
              { agentId: data.senderId },
              { agentId: data.targetAgentId },
            ],
          },
        },
      });

      return this.send({
        channelId: channel.id,
        senderId: data.senderId,
        content: data.content,
        priority: data.priority,
        structuredData: data.structuredData,
      });
    }

    return this.send({
      channelId: dmChannel.id,
      senderId: data.senderId,
      content: data.content,
      priority: data.priority,
      structuredData: data.structuredData,
    });
  }

  async list(filters: {
    channelId: string;
    limit?: number;
    before?: string;
    threadId?: string;
  }) {
    return prisma.message.findMany({
      where: {
        channelId: filters.channelId,
        ...(filters.before ? { createdAt: { lt: new Date(filters.before) } } : {}),
        ...(filters.threadId ? { threadId: filters.threadId } : { threadId: null }),
      },
      include: { sender: true, replies: { include: { sender: true } } },
      orderBy: { createdAt: "desc" },
      take: filters.limit ?? 50,
    });
  }

  async acknowledge(messageId: string) {
    return prisma.message.update({
      where: { id: messageId },
      data: { acknowledged: true },
      include: { sender: true },
    });
  }

  async listChannels(agentId?: string) {
    return prisma.channel.findMany({
      where: agentId
        ? { members: { some: { agentId } } }
        : undefined,
      include: {
        members: { include: { agent: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: true },
        },
      },
    });
  }
}
