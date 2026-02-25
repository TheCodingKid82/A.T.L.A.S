export const AGENT_SLUGS = ["henry", "poke", "iris"] as const;
export type AgentSlug = (typeof AGENT_SLUGS)[number];

export const AGENT_NAMES: Record<AgentSlug, string> = {
  henry: "H.E.N.R.Y.",
  poke: "P.O.K.E.",
  iris: "I.R.I.S.",
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

export const API_KEY_PREFIX = "atl_";

export const MCP_SERVER_PORT = 3001;
export const DASHBOARD_PORT = 3000;
