#!/usr/bin/env tsx

/**
 * Script to add MCP servers from config/mcp-servers.json to the database
 * 
 * Usage:
 *   tsx scripts/add-mcp-servers.ts
 *   tsx scripts/add-mcp-servers.ts --dry-run
 *   tsx scripts/add-mcp-servers.ts --server task-trellis-mcp
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

interface McpServerConfig {
  name: string;
  enabled?: boolean;
  transport: string;
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  metadata?: any;
  permissions?: Record<string, string[]>;
}

interface ConfigFile {
  version: string;
  description?: string;
  servers: McpServerConfig[];
}

async function loadConfig(): Promise<ConfigFile> {
  const configPath = join(process.cwd(), "config", "mcp-servers.json");
  const configData = readFileSync(configPath, "utf-8");
  return JSON.parse(configData);
}

async function addMcpServer(server: McpServerConfig, dryRun: boolean = false) {
  // Skip if not enabled
  if (server.enabled === false) {
    console.log(`⏭️  Skipping disabled server: ${server.name}`);
    return;
  }

  // Check if server already exists
  const existing = await prisma.mcpConnection.findUnique({
    where: { name: server.name },
  });

  if (existing) {
    console.log(`⚠️  Server already exists: ${server.name} (id: ${existing.id})`);
    return;
  }

  // For stdio transport, we need to store command info in metadata
  const metadata = server.metadata || {};
  if (server.transport === "stdio") {
    metadata.transport_config = {
      command: server.command,
      args: server.args,
      env: server.env || {},
    };
    // Use a placeholder URL for stdio transport
    server.url = `stdio://${server.name}`;
  }

  if (dryRun) {
    console.log(`🔍 [DRY RUN] Would add server: ${server.name}`);
    console.log(`   Transport: ${server.transport}`);
    console.log(`   URL: ${server.url}`);
    console.log(`   Metadata:`, JSON.stringify(metadata, null, 2));
    return;
  }

  // Create MCP connection
  const connection = await prisma.mcpConnection.create({
    data: {
      name: server.name,
      url: server.url || `stdio://${server.name}`,
      transport: server.transport,
      metadata,
      status: "UNKNOWN",
    },
  });

  console.log(`✅ Added MCP server: ${server.name} (id: ${connection.id})`);

  // Add permissions if specified
  if (server.permissions) {
    for (const [agentSlug, tools] of Object.entries(server.permissions)) {
      const agent = await prisma.agent.findUnique({
        where: { slug: agentSlug },
      });

      if (!agent) {
        console.log(`   ⚠️  Agent not found: ${agentSlug}, skipping permissions`);
        continue;
      }

      if (dryRun) {
        console.log(`🔍 [DRY RUN] Would add permissions for ${agentSlug}: ${tools.join(", ")}`);
        continue;
      }

      await prisma.mcpPermission.create({
        data: {
          mcpConnectionId: connection.id,
          agentId: agent.id,
          allowedTools: tools,
        },
      });

      console.log(`   ✅ Added permissions for ${agent.name}: ${tools.length} tools`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const serverFilter = args.find((arg) => arg.startsWith("--server="))?.split("=")[1];

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║      A.T.L.A.S. MCP Server Import Script        ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  }

  try {
    const config = await loadConfig();
    console.log(`📖 Loaded configuration version ${config.version}`);
    console.log(`📋 Found ${config.servers.length} server(s) in config\n`);

    let serversToAdd = config.servers;
    if (serverFilter) {
      serversToAdd = config.servers.filter((s) => s.name === serverFilter);
      console.log(`🔍 Filtering for server: ${serverFilter}\n`);
    }

    if (serversToAdd.length === 0) {
      console.log("❌ No servers found to add");
      return;
    }

    for (const server of serversToAdd) {
      await addMcpServer(server, dryRun);
    }

    console.log("\n✨ Import complete!\n");
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
