import { prisma } from "@atlas/database";
import { MessageService } from "@atlas/services";

const messageService = new MessageService();

let workLogChannelId: string | null = null;

async function getWorkLogChannelId(): Promise<string | null> {
  if (workLogChannelId) return workLogChannelId;

  const channel = await prisma.channel.findFirst({
    where: { name: "work-log", type: "GROUP" },
  });

  if (channel) {
    workLogChannelId = channel.id;
  }

  return workLogChannelId;
}

export class Notifier {
  constructor(
    private workerId: string,
    private requesterId: string
  ) {}

  async send(
    content: string,
    priority: "URGENT" | "HIGH" | "NORMAL" | "LOW" = "NORMAL"
  ) {
    // Send DM to requester
    try {
      await messageService.sendDirect({
        senderId: this.workerId,
        targetAgentId: this.requesterId,
        content,
        priority,
        structuredData: { source: "worker", type: "work_update" },
      });
    } catch (error) {
      console.error("[NOTIFIER] Failed to send DM:", error);
    }

    // Post to #work-log channel
    try {
      const channelId = await getWorkLogChannelId();
      if (channelId) {
        await messageService.send({
          senderId: this.workerId,
          channelId,
          content,
          priority,
          structuredData: { source: "worker", type: "work_update" },
        });
      }
    } catch (error) {
      console.error("[NOTIFIER] Failed to post to #work-log:", error);
    }
  }
}
