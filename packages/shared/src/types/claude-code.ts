export interface ClaudeCodeActionInfo {
  id: string;
  agentId: string;
  action: string;
  sessionId: string | null;
  prompt: string;
  workingDirectory: string | null;
  result: unknown;
  duration: number | null;
  createdAt: Date;
}
