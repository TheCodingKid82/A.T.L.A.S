export type MessagePriority = "URGENT" | "HIGH" | "NORMAL" | "LOW";
export type ChannelType = "GROUP" | "DIRECT";

export interface MessageInfo {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  priority: MessagePriority;
  threadId: string | null;
  structuredData: unknown;
  acknowledged: boolean;
  createdAt: Date;
}

export interface ChannelInfo {
  id: string;
  name: string;
  type: ChannelType;
  description: string | null;
  createdAt: Date;
}
