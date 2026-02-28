export const AGENT_SLUGS = ["henry", "poke", "iris", "worker"] as const;
export type AgentSlug = (typeof AGENT_SLUGS)[number];

export const AGENT_NAMES: Record<AgentSlug, string> = {
  henry: "H.E.N.R.Y.",
  poke: "P.O.K.E.",
  iris: "I.R.I.S.",
  worker: "C.O.D.E.",
};

export const DEFAULT_BOARD_COLUMNS = [
  "Backlog",
  "In Progress",
  "Review",
  "Complete",
] as const;

export const TASK_PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export const AGENT_STATUSES = ["ONLINE", "OFFLINE", "ERROR", "PROCESSING"] as const;
export const MESSAGE_PRIORITIES = ["URGENT", "HIGH", "NORMAL", "LOW"] as const;
export const CHANNEL_TYPES = ["GROUP", "DIRECT"] as const;
export const MCP_STATUSES = ["HEALTHY", "UNHEALTHY", "UNKNOWN"] as const;

export const MEMORY_CONTAINER_TAGS = {
  global: "atlas-global",
  agent: (slug: string) => `atlas-agent-${slug}`,
  project: (slug: string) => `atlas-project-${slug}`,
} as const;

export const BROWSER_SESSION_NAME = "atlas-shared";

export const CLAUDE_CODE_DEFAULT_TIMEOUT = 300000;

export const WORK_SESSION_STATUSES = ["ACTIVE", "PAUSED", "COMPLETED", "FAILED", "CANCELLED"] as const;
export const WORK_SESSION_TYPES = ["CODE", "RESEARCH", "GITHUB", "BROWSER", "GENERAL"] as const;
export const WORK_MESSAGE_STATUSES = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"] as const;
export const WORK_MESSAGE_ROLES = ["USER", "WORKER"] as const;

export const WORKER_POLL_INTERVAL_MS = 5000;
export const WORKER_EXECUTION_TIMEOUT = 1800000; // 30 minutes
export const WORKER_AGENT_SLUG = "worker";
export const WORKER_AGENT_NAME = "C.O.D.E.";

export const API_KEY_PREFIX = "atl_";

export const MCP_SERVER_PORT = 3001;
export const DASHBOARD_PORT = 3000;
