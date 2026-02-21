export type McpConnectionStatus = "HEALTHY" | "UNHEALTHY" | "UNKNOWN";

export interface McpConnectionInfo {
  id: string;
  name: string;
  url: string;
  transport: string;
  status: McpConnectionStatus;
  lastHealthCheck: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface McpPermissionInfo {
  id: string;
  mcpConnectionId: string;
  agentId: string;
  allowedTools: string[];
  createdAt: Date;
}
