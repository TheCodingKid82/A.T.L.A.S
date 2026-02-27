import { PrismaClient } from "@prisma/client";
import { randomBytes, createHash } from "crypto";

const prisma = new PrismaClient();

function generateApiKey(slug: string): { key: string; hash: string; prefix: string } {
  const random = randomBytes(16).toString("hex");
  const key = `atl_${slug}_${random}`;
  const hash = createHash("sha256").update(key).digest("hex");
  const prefix = `atl_${slug}_`;
  return { key, hash, prefix };
}

async function main() {
  console.log("Seeding A.T.L.A.S. database...\n");

  // Generate API keys for each agent
  const henryKey = generateApiKey("henry");
  const pokeKey = generateApiKey("poke");
  const irisKey = generateApiKey("iris");
  const workerKey = generateApiKey("worker");

  // Create agents
  const henry = await prisma.agent.upsert({
    where: { slug: "henry" },
    update: {},
    create: {
      name: "H.E.N.R.Y.",
      slug: "henry",
      description: "Helpful Executive for Networking, Research & Yielding results — Business AI assistant",
      apiKeyHash: henryKey.hash,
      apiKeyPrefix: henryKey.prefix,
      rateLimit: 200,
    },
  });

  const poke = await prisma.agent.upsert({
    where: { slug: "poke" },
    update: {},
    create: {
      name: "P.O.K.E.",
      slug: "poke",
      description: "Personal Organizer for Knowledge & Errands — Personal AI assistant",
      apiKeyHash: pokeKey.hash,
      apiKeyPrefix: pokeKey.prefix,
      rateLimit: 150,
    },
  });

  const iris = await prisma.agent.upsert({
    where: { slug: "iris" },
    update: {},
    create: {
      name: "I.R.I.S.",
      slug: "iris",
      description: "Intelligent Reality Interface System — Smart glasses AI",
      apiKeyHash: irisKey.hash,
      apiKeyPrefix: irisKey.prefix,
      rateLimit: 100,
    },
  });

  const worker = await prisma.agent.upsert({
    where: { slug: "worker" },
    update: {},
    create: {
      name: "C.O.D.E.",
      slug: "worker",
      description: "Claude Orchestrated Development Engine — Background worker for async task execution using Claude Code CLI, GitHub CLI, and ATLAS tools",
      apiKeyHash: workerKey.hash,
      apiKeyPrefix: workerKey.prefix,
      rateLimit: 500,
    },
  });

  // Create default board with columns
  const board = await prisma.board.create({
    data: {
      name: "A.T.L.A.S. Main",
      description: "Default task board for all agents",
      columns: {
        create: [
          { name: "Backlog", position: 0 },
          { name: "In Progress", position: 1 },
          { name: "Review", position: 2 },
          { name: "Complete", position: 3 },
        ],
      },
    },
  });

  // Create general channel with all agents
  const generalChannel = await prisma.channel.create({
    data: {
      name: "general",
      type: "GROUP",
      description: "General channel for all agents",
      members: {
        create: [
          { agentId: henry.id },
          { agentId: poke.id },
          { agentId: iris.id },
          { agentId: worker.id },
        ],
      },
    },
  });

  // Create #work-log channel for worker updates
  const workLogChannel = await prisma.channel.create({
    data: {
      name: "work-log",
      type: "GROUP",
      description: "Work request progress updates from C.O.D.E.",
      members: {
        create: [
          { agentId: henry.id },
          { agentId: poke.id },
          { agentId: iris.id },
          { agentId: worker.id },
        ],
      },
    },
  });

  // Create DM channels between each pair
  const dmHenryPoke = await prisma.channel.create({
    data: {
      name: "henry-poke-dm",
      type: "DIRECT",
      members: {
        create: [
          { agentId: henry.id },
          { agentId: poke.id },
        ],
      },
    },
  });

  const dmHenryIris = await prisma.channel.create({
    data: {
      name: "henry-iris-dm",
      type: "DIRECT",
      members: {
        create: [
          { agentId: henry.id },
          { agentId: iris.id },
        ],
      },
    },
  });

  const dmPokeIris = await prisma.channel.create({
    data: {
      name: "poke-iris-dm",
      type: "DIRECT",
      members: {
        create: [
          { agentId: poke.id },
          { agentId: iris.id },
        ],
      },
    },
  });

  // DM channels for C.O.D.E. worker
  const dmHenryWorker = await prisma.channel.create({
    data: {
      name: "henry-worker-dm",
      type: "DIRECT",
      members: {
        create: [
          { agentId: henry.id },
          { agentId: worker.id },
        ],
      },
    },
  });

  const dmPokeWorker = await prisma.channel.create({
    data: {
      name: "poke-worker-dm",
      type: "DIRECT",
      members: {
        create: [
          { agentId: poke.id },
          { agentId: worker.id },
        ],
      },
    },
  });

  const dmIrisWorker = await prisma.channel.create({
    data: {
      name: "iris-worker-dm",
      type: "DIRECT",
      members: {
        create: [
          { agentId: iris.id },
          { agentId: worker.id },
        ],
      },
    },
  });

  // Register Zapier MCP connection + grant all agents access
  const zapierMcp = await prisma.mcpConnection.upsert({
    where: { name: "zapier" },
    update: {
      url: "https://mcp.zapier.com/api/v1/connect",
    },
    create: {
      name: "zapier",
      url: "https://mcp.zapier.com/api/v1/connect",
      transport: "streamable-http",
      metadata: {
        description: "Zapier MCP — connects all ATLAS agents to Zapier automations",
      },
    },
  });

  // Grant all agents access to Zapier MCP (empty allowedTools = all tools)
  for (const agent of [henry, poke, iris, worker]) {
    await prisma.mcpPermission.upsert({
      where: {
        mcpConnectionId_agentId: {
          mcpConnectionId: zapierMcp.id,
          agentId: agent.id,
        },
      },
      update: { allowedTools: [] },
      create: {
        mcpConnectionId: zapierMcp.id,
        agentId: agent.id,
        allowedTools: [], // empty = all tools allowed
      },
    });
  }

  // Print API keys (only shown once!)
  console.log("=".repeat(60));
  console.log("  A.T.L.A.S. Agent API Keys (save these — shown once!)");
  console.log("=".repeat(60));
  console.log(`  H.E.N.R.Y.: ${henryKey.key}`);
  console.log(`  P.O.K.E.:   ${pokeKey.key}`);
  console.log(`  I.R.I.S.:   ${irisKey.key}`);
  console.log(`  C.O.D.E.:   ${workerKey.key}`);
  console.log("=".repeat(60));
  console.log(`\n  Board: "${board.name}" created with 4 columns`);
  console.log(`  Channels: general + work-log + 6 DM channels created`);
  console.log(`  Agents: ${henry.name}, ${poke.name}, ${iris.name}, ${worker.name}\n`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
