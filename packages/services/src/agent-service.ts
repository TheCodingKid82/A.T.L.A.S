import { prisma } from "@atlas/database";
import { hashApiKey, generateApiKey } from "@atlas/shared";

export class AgentService {
  async list(filters?: { status?: "ONLINE" | "OFFLINE" | "ERROR" | "PROCESSING" }) {
    return prisma.agent.findMany({
      where: filters?.status ? { status: filters.status } : undefined,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        rateLimit: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true,
        apiKeyPrefix: true,
      },
    });
  }

  async get(id: string) {
    return prisma.agent.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        rateLimit: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true,
        apiKeyPrefix: true,
      },
    });
  }

  async updateStatus(id: string, status: "ONLINE" | "OFFLINE" | "ERROR" | "PROCESSING") {
    return prisma.agent.update({
      where: { id },
      data: { status, lastActiveAt: new Date() },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        lastActiveAt: true,
      },
    });
  }

  async authenticateByApiKey(apiKey: string) {
    const hash = hashApiKey(apiKey);
    const agent = await prisma.agent.findUnique({
      where: { apiKeyHash: hash },
    });
    if (!agent) return null;

    await prisma.agent.update({
      where: { id: agent.id },
      data: { lastActiveAt: new Date() },
    });

    return agent;
  }

  async regenerateApiKey(id: string) {
    const agent = await prisma.agent.findUniqueOrThrow({ where: { id } });
    const { key, hash, prefix } = generateApiKey(agent.slug);
    await prisma.agent.update({
      where: { id },
      data: { apiKeyHash: hash, apiKeyPrefix: prefix },
    });
    return { key, prefix };
  }

  async whoami(agentId: string) {
    const agent = await prisma.agent.findUniqueOrThrow({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        rateLimit: true,
        lastActiveAt: true,
      },
    });

    const allAgents = await prisma.agent.findMany({
      where: { id: { not: agentId } },
      select: { name: true, slug: true, description: true, status: true },
    });

    return {
      ...agent,
      system: {
        name: "A.T.L.A.S.",
        fullName: "Automated Task Logic and Agent Supervision",
        version: "0.1.0",
        description: "A.T.L.A.S. is the central AI orchestration hub that connects and coordinates all agents. It provides shared task management, inter-agent messaging, persistent memory, document storage, browser automation, and external MCP integrations — so every agent operates from a single source of truth.",
        yourRole: `You are ${agent.name} (${agent.description}). You are connected to A.T.L.A.S. to collaborate with other agents, manage tasks, share knowledge through memory, and access shared resources. Use the tools provided to coordinate your work with the team.`,
        teammates: allAgents,
        toolCategories: [
          { name: "Agent Tools (4)", description: "View team members, check your identity, update your status" },
          { name: "Task Tools (8)", description: "Create, assign, update, and track tasks on Kanban boards" },
          { name: "Memory Tools (5)", description: "Store and search shared knowledge via Supermemory — use container tags to scope memories globally or per-agent" },
          { name: "Message Tools (5)", description: "Send messages to channels or direct to other agents for real-time coordination" },
          { name: "Document Tools (7)", description: "Create and manage versioned documents with tags" },
          { name: "Browser Tools (8)", description: "Automate web browsing — navigate, click, fill forms, take screenshots" },
          { name: "MCP Tools (3)", description: "Check registered external MCP server connections and their health" },
        ],
        tips: [
          "Use atlas_agent_whoami on first connect to understand your role",
          "Check atlas_task_list to see what needs doing",
          "Use atlas_message_list on the 'general' channel for team updates",
          "Store important findings with atlas_memory_add using your agent container tag",
        ],
      },
    };
  }
}
