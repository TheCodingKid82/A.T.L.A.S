export type AgentStatus = "ONLINE" | "OFFLINE" | "ERROR" | "PROCESSING";

export interface AgentInfo {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: AgentStatus;
  rateLimit: number;
  lastActiveAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentContext {
  agentId: string;
  agentSlug: string;
  agentName: string;
}
