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

  // Print API keys (only shown once!)
  console.log("=".repeat(60));
  console.log("  A.T.L.A.S. Agent API Keys (save these — shown once!)");
  console.log("=".repeat(60));
  console.log(`  H.E.N.R.Y.: ${henryKey.key}`);
  console.log(`  P.O.K.E.:   ${pokeKey.key}`);
  console.log(`  I.R.I.S.:   ${irisKey.key}`);
  console.log("=".repeat(60));
  console.log(`\n  Board: "${board.name}" created with 4 columns`);
  console.log(`  Channels: general + 3 DM channels created`);
  console.log(`  Agents: ${henry.name}, ${poke.name}, ${iris.name}\n`);
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
