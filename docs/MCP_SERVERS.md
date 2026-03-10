# MCP Servers in A.T.L.A.S.

This document explains how MCP (Model Context Protocol) servers are managed in A.T.L.A.S. and provides guidance on adding new MCP integrations.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Adding MCP Servers](#adding-mcp-servers)
- [Registered Servers](#registered-servers)
- [Permissions](#permissions)
- [Transport Types](#transport-types)

## Overview

A.T.L.A.S. uses a **database-driven approach** to manage external MCP server connections. This allows for dynamic registration, health monitoring, and fine-grained permission control for each agent.

## Architecture

```
┌─────────────────────┐
│  A.T.L.A.S Agents   │
│  (H.E.N.R.Y., etc)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  A.T.L.A.S MCP      │
│  Server (Port 3001) │
└──────────┬──────────┘
           │
           ├──────────────┐
           ▼              ▼
┌──────────────────┐  ┌──────────────────┐
│  Internal Tools  │  │  External MCP    │
│  (33 tools)      │  │  Servers         │
└──────────────────┘  └──────────────────┘
                      - Trellis MCP
                      - GitHub MCP
                      - Custom MCPs
```

## Configuration

MCP servers are configured in `config/mcp-servers.json`:

```json
{
  "version": "1.0.0",
  "servers": [
    {
      "name": "task-trellis-mcp",
      "enabled": true,
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@task-trellis/mcp-server", "{{projectFolder}}", "{{trellisFolder}}"],
      "env": {},
      "metadata": {
        "description": "Task management system",
        "version": "latest"
      },
      "permissions": {
        "henry": ["trellis_*"],
        "poke": ["trellis_*"]
      }
    }
  ]
}
```

## Adding MCP Servers

### Method 1: Using Configuration File (Recommended)

1. **Edit the configuration file** (`config/mcp-servers.json`):

```json
{
  "servers": [
    {
      "name": "my-custom-mcp",
      "enabled": true,
      "transport": "stdio",
      "command": "node",
      "args": ["./path/to/server.js"],
      "env": {
        "API_KEY": "your-api-key"
      },
      "metadata": {
        "description": "My custom MCP server"
      },
      "permissions": {
        "henry": ["custom_*"]
      }
    }
  ]
}
```

2. **Run the import script**:

```bash
# Dry run first (recommended)
pnpm tsx scripts/add-mcp-servers.ts --dry-run

# Import all servers
pnpm tsx scripts/add-mcp-servers.ts

# Import specific server
pnpm tsx scripts/add-mcp-servers.ts --server=my-custom-mcp
```

### Method 2: Using the Service Layer

```typescript
import { McpRegistryService } from "@atlas/services";
import { prisma } from "@atlas/database";

const mcpRegistry = new McpRegistryService();

// Register MCP connection
const connection = await mcpRegistry.register({
  name: "my-custom-mcp",
  url: "http://localhost:3100/mcp", // or "stdio://my-custom-mcp" for stdio
  transport: "streamable-http", // or "stdio"
  metadata: {
    description: "Custom MCP server",
    transport_config: {
      command: "node",
      args: ["./server.js"],
      env: {}
    }
  }
});

// Set permissions
const agent = await prisma.agent.findUnique({ where: { slug: "henry" } });
await mcpRegistry.setPermission(connection.id, agent.id, ["custom_*"]);
```

### Method 3: Using the Dashboard

1. Navigate to `http://localhost:3000/mcps`
2. View all registered MCP connections
3. Check health status
4. Monitor permissions

### Method 4: Direct Database Access

```typescript
import { prisma } from "@atlas/database";

await prisma.mcpConnection.create({
  data: {
    name: "my-custom-mcp",
    url: "stdio://my-custom-mcp",
    transport: "stdio",
    status: "UNKNOWN",
    metadata: {
      transport_config: {
        command: "npx",
        args: ["-y", "my-package"],
        env: {}
      }
    }
  }
});
```

## Registered Servers

### Task Trellis MCP

**Purpose**: Intelligent task management and organization system

**Configuration**:
- **Name**: `task-trellis-mcp`
- **Transport**: stdio
- **Command**: `npx -y @task-trellis/mcp-server {{projectFolder}} {{trellisFolder}}`

**Required Variables**:
- `projectFolder`: Path to the project directory
- `trellisFolder`: Path to the Trellis configuration folder (usually `.trellis`)

**Available Tools**: See Trellis MCP documentation

**Permissions**:
- **H.E.N.R.Y.**: Full access (`trellis_*`)
- **P.O.K.E.**: Full access (`trellis_*`)
- **I.R.I.S.**: Read-only access (`trellis_read_*`, `trellis_list_*`)

## Permissions

Permissions control which tools each agent can access from external MCP servers.

### Permission Format

```typescript
{
  "agentSlug": ["tool1", "tool2", "tool_prefix_*"]
}
```

### Wildcard Support

- `*` - All tools
- `prefix_*` - All tools starting with prefix
- `*_suffix` - All tools ending with suffix

### Setting Permissions

```typescript
import { McpRegistryService } from "@atlas/services";

const mcpRegistry = new McpRegistryService();

await mcpRegistry.setPermission(
  "mcp-connection-id",
  "agent-id",
  ["tool1", "tool2", "prefix_*"]
);
```

### Viewing Permissions

```bash
# Via dashboard
http://localhost:3000/mcps

# Via API
curl http://localhost:3000/api/mcps

# Via database
SELECT 
  mc.name as mcp_name,
  a.name as agent_name,
  mp.allowed_tools
FROM mcp_permissions mp
JOIN mcp_connections mc ON mp.mcp_connection_id = mc.id
JOIN agents a ON mp.agent_id = a.id;
```

## Transport Types

### 1. stdio (Standard Input/Output)

Used for command-line MCP servers:

```json
{
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "package-name"],
  "env": {
    "VAR": "value"
  }
}
```

**Stored in database**:
- URL: `stdio://server-name`
- Metadata: Contains `transport_config` with command details

### 2. streamable-http (HTTP)

Used for HTTP-based MCP servers:

```json
{
  "transport": "streamable-http",
  "url": "http://localhost:3100/mcp"
}
```

### 3. sse (Server-Sent Events)

Used for SSE-based MCP servers:

```json
{
  "transport": "sse",
  "url": "http://localhost:3100/sse"
}
```

## Health Monitoring

### Check Health via API

```bash
curl -X POST http://localhost:3000/api/mcps/{id}/health
```

### Check Health via Dashboard

Navigate to MCP page and click "Check Health" button

### Programmatic Health Check

```typescript
import { McpRegistryService } from "@atlas/services";

const mcpRegistry = new McpRegistryService();
const result = await mcpRegistry.healthCheck("mcp-connection-id");

console.log(result.status); // HEALTHY, UNHEALTHY, or UNKNOWN
```

## Database Schema

```prisma
model McpConnection {
  id              String              @id @default(cuid())
  name            String              @unique
  url             String
  transport       String              @default("streamable-http")
  status          McpConnectionStatus @default(UNKNOWN)
  lastHealthCheck DateTime?
  metadata        Json?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
  
  permissions     McpPermission[]
}

model McpPermission {
  id              String   @id @default(cuid())
  mcpConnectionId String
  agentId         String
  allowedTools    String[] @default([])
  
  mcpConnection   McpConnection @relation(...)
  agent           Agent         @relation(...)
}
```

## Troubleshooting

### Server Not Showing in Dashboard

1. Check if server is enabled in config: `"enabled": true`
2. Verify database entry exists: `SELECT * FROM mcp_connections WHERE name = 'server-name'`
3. Check logs for import errors

### Permission Issues

1. Verify agent exists: `SELECT * FROM agents WHERE slug = 'agent-slug'`
2. Check permission entry: `SELECT * FROM mcp_permissions WHERE agent_id = '...'`
3. Ensure tool pattern matches (wildcards supported)

### stdio Transport Not Working

1. Verify command is executable: `which npx`
2. Check package exists: `npx -y package-name --help`
3. Review metadata `transport_config` in database
4. Note: stdio transport requires additional implementation for execution

### Health Check Failures

1. For HTTP: Ensure server is running and accessible
2. For stdio: Health checks return UNKNOWN (requires manual verification)
3. Check firewall/network settings
4. Review server logs

## API Reference

### List MCP Connections

```http
GET /api/mcps
```

### Get MCP Connection

```http
GET /api/mcps/:id
```

### Health Check

```http
POST /api/mcps/:id/health
```

## Scripts Reference

### Import MCP Servers

```bash
# Import all configured servers
pnpm tsx scripts/add-mcp-servers.ts

# Dry run (no changes)
pnpm tsx scripts/add-mcp-servers.ts --dry-run

# Import specific server
pnpm tsx scripts/add-mcp-servers.ts --server=task-trellis-mcp
```

### Update Package.json Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "mcp:import": "tsx scripts/add-mcp-servers.ts",
    "mcp:import:dry": "tsx scripts/add-mcp-servers.ts --dry-run"
  }
}
```

## Best Practices

1. **Always use dry-run first** when importing new servers
2. **Document required variables** in metadata
3. **Use semantic naming** for MCP servers (e.g., `service-name-mcp`)
4. **Set appropriate permissions** per agent role
5. **Monitor health regularly** for HTTP-based servers
6. **Version your configurations** using the `version` field
7. **Store sensitive data in environment variables**, not in config

## Security Considerations

1. **API Keys**: Store in environment variables, reference in `env` config
2. **Permissions**: Follow principle of least privilege
3. **Health Checks**: Don't expose sensitive information
4. **stdio Commands**: Validate and sanitize command arguments
5. **Network Access**: Use HTTPS for production HTTP-based servers

## Contributing

When adding a new MCP server:

1. Update `config/mcp-servers.json`
2. Document in this file
3. Test with dry-run first
4. Create PR with clear description
5. Update version number if needed

## Resources

- [MCP Specification](https://modelcontextprotocol.io)
- [Task Trellis MCP](https://github.com/task-trellis/mcp-server)
- [A.T.L.A.S. Architecture](../README.md)
