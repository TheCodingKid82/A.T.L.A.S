export type WorkSessionStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELLED";
export type WorkSessionType = "CODE" | "RESEARCH" | "GITHUB" | "BROWSER" | "GENERAL";
export type WorkMessageRole = "USER" | "WORKER";
export type WorkMessageStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface WorkMessageInfo {
  id: string;
  sessionId: string;
  role: WorkMessageRole;
  content: string;
  status: WorkMessageStatus;
  result: unknown;
  duration: number | null;
  errorMessage: string | null;
  createdAt: Date;
}

export interface WorkSessionInfo {
  id: string;
  requesterId: string;
  workerId: string | null;
  type: WorkSessionType;
  title: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: WorkSessionStatus;
  workingDirectory: string | null;
  claudeSessionId: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  messages?: WorkMessageInfo[];
}
