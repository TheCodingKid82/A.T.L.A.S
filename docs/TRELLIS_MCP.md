# Task Trellis MCP Integration

This document provides detailed information about the Task Trellis MCP integration in A.T.L.A.S.

## Overview

Task Trellis is an intelligent task management and organization system that integrates with A.T.L.A.S. through the Model Context Protocol (MCP). It provides agents with powerful task management capabilities beyond the built-in Kanban board system.

## Features

- 📋 Advanced task organization
- 🔗 Dependency tracking
- 🏷️ Rich tagging and categorization
- 📊 Project management
- 🔍 Smart task search
- 📅 Due date management
- 🤖 AI-friendly task representation

## Installation

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 9.0.0
- Task Trellis package: `@task-trellis/mcp-server`

### Setup

1. **Install Task Trellis MCP (Optional - uses npx by default)**:

```bash
npm install -g @task-trellis/mcp-server
```

2. **Configure Project Variables**:

Create a `.env.local` or update `.env` with:

```bash
# Task Trellis Configuration
TRELLIS_PROJECT_FOLDER="/path/to/your/project"
TRELLIS_FOLDER="/path/to/your/project/.trellis"
```

3. **Import Trellis MCP to Database**:

```bash
# Dry run to verify
pnpm tsx scripts/add-mcp-servers.ts --dry-run --server=task-trellis-mcp

# Import
pnpm tsx scripts/add-mcp-servers.ts --server=task-trellis-mcp
```

4. **Verify Installation**:

```bash
# Check in dashboard
open http://localhost:3000/mcps

# Or via API
curl http://localhost:3000/api/mcps
```

## Configuration

The Trellis MCP is configured in `config/mcp-servers.json`:

```json
{
  "name": "task-trellis-mcp",
  "enabled": true,
  "transport": "stdio",
  "command": "npx",
  "args": [
    "-y",
    "@task-trellis/mcp-server",
    "{{projectFolder}}",
    "{{trellisFolder}}"
  ],
  "env": {},
  "metadata": {
    "description": "Task Trellis MCP - Intelligent task management",
    "version": "latest",
    "category": "productivity",
    "documentation": "https://github.com/task-trellis/mcp-server",
    "requiredVariables": {
      "projectFolder": {
        "description": "Path to the project folder",
        "example": "/path/to/project",
        "required": true
      },
      "trellisFolder": {
        "description": "Path to the Trellis configuration folder",
        "example": "/path/to/.trellis",
        "required": true
      }
    }
  },
  "permissions": {
    "henry": ["trellis_*"],
    "poke": ["trellis_*"],
    "iris": ["trellis_read_*", "trellis_list_*"]
  }
}
```

## Architecture

```
┌─────────────────────────────────────┐
│     A.T.L.A.S. Agents               │
│  (H.E.N.R.Y., P.O.K.E., I.R.I.S.)  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    A.T.L.A.S. MCP Server            │
│    (Internal + External MCPs)       │
└──────────────┬──────────────────────┘
               │
               ├─────────────────┬──────────────────┐
               ▼                 ▼                  ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Kanban Board    │  │  Task Trellis    │  │  Other MCPs      │
│  (Built-in)      │  │  MCP (stdio)     │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │  Project Folder  │
                      │  .trellis/       │
                      └──────────────────┘
```

## Variable Substitution

When importing, replace template variables with actual paths:

| Variable | Template | Example |
|----------|----------|---------|
| Project Folder | `{{projectFolder}}` | `/home/user/projects/myapp` |
| Trellis Folder | `{{trellisFolder}}` | `/home/user/projects/myapp/.trellis` |

## Permissions

### H.E.N.R.Y. (Business AI)
- **Access**: Full (`trellis_*`)
- **Capabilities**: Create, read, update, delete tasks
- **Use Case**: Project management, business task tracking

### P.O.K.E. (Personal AI)
- **Access**: Full (`trellis_*`)
- **Capabilities**: Create, read, update, delete tasks
- **Use Case**: Personal task management, errands

### I.R.I.S. (Smart Glasses AI)
- **Access**: Read-only (`trellis_read_*`, `trellis_list_*`)
- **Capabilities**: View and search tasks only
- **Use Case**: Quick task lookup, status checks

## Available Tools

The Trellis MCP provides various tools (exact list depends on package version):

### Task Management
- `trellis_create_task` - Create a new task
- `trellis_read_task` - Read task details
- `trellis_update_task` - Update task information
- `trellis_delete_task` - Delete a task
- `trellis_list_tasks` - List all tasks

### Organization
- `trellis_list_projects` - List all projects
- `trellis_search_tasks` - Search tasks by criteria
- `trellis_get_dependencies` - Get task dependencies
- `trellis_set_dependency` - Create task dependency

### Status & Metadata
- `trellis_get_status` - Get task status
- `trellis_set_status` - Update task status
- `trellis_add_tags` - Add tags to task
- `trellis_remove_tags` - Remove tags from task

*Note: Exact tool names may vary. Check Trellis MCP documentation for complete list.*

## Usage Examples

### From A.T.L.A.S. Agents

Agents can use Trellis tools through the A.T.L.A.S. MCP server:

```typescript
// Example: H.E.N.R.Y. creating a task
{
  "tool": "trellis_create_task",
  "arguments": {
    "title": "Review Q1 financials",
    "description": "Analyze revenue and expenses for Q1",
    "project": "finance",
    "tags": ["review", "finance", "q1"],
    "priority": "high",
    "dueDate": "2026-03-31"
  }
}

// Example: P.O.K.E. listing personal tasks
{
  "tool": "trellis_list_tasks",
  "arguments": {
    "project": "personal",
    "status": "todo"
  }
}

// Example: I.R.I.S. searching for tasks
{
  "tool": "trellis_search_tasks",
  "arguments": {
    "query": "grocery",
    "tags": ["shopping"]
  }
}
```

### Via MCP Tools

Agents first call `atlas_mcp_list` to see available tools, then call them through the external MCP connection.

## File Structure

Task Trellis stores data in the configured Trellis folder:

```
project-root/
├── .trellis/
│   ├── config.json          # Trellis configuration
│   ├── tasks/               # Task definitions
│   │   ├── task-001.json
│   │   ├── task-002.json
│   │   └── ...
│   ├── projects/            # Project definitions
│   │   ├── personal.json
│   │   ├── work.json
│   │   └── ...
│   └── index.json           # Task index
└── ... (your project files)
```

## Integration with Built-in Tasks

A.T.L.A.S. has both:
1. **Built-in Kanban Board** - For team-wide task coordination
2. **Task Trellis MCP** - For advanced, project-specific task management

### When to Use Each

| Feature | Kanban Board | Task Trellis |
|---------|--------------|--------------|
| Team coordination | ✅ | ❌ |
| Agent assignments | ✅ | ❌ |
| Multi-column workflow | ✅ | Limited |
| Dependency tracking | ❌ | ✅ |
| Project organization | Limited | ✅ |
| File-based storage | ❌ | ✅ |
| Version control friendly | ❌ | ✅ |
| External tool integration | ❌ | ✅ |

**Best Practice**: Use Kanban for agent coordination and Trellis for detailed project task management.

## Troubleshooting

### "Command not found: npx"

**Solution**: Ensure Node.js is installed:
```bash
node --version
npm --version
```

### "Cannot find package @task-trellis/mcp-server"

**Solution**: 
- The `npx -y` flag automatically installs the package
- Or install globally: `npm install -g @task-trellis/mcp-server`
- Check package exists: `npm view @task-trellis/mcp-server`

### "Invalid project folder" or "Invalid trellis folder"

**Solution**: 
1. Verify paths are absolute
2. Ensure directories exist: `mkdir -p /path/to/project/.trellis`
3. Check permissions: `ls -la /path/to/project`

### "Permission denied"

**Solution**:
1. Check agent has appropriate permissions in database
2. Verify `allowedTools` includes the tool (e.g., `trellis_*`)
3. Re-import with: `pnpm tsx scripts/add-mcp-servers.ts --server=task-trellis-mcp`

### Trellis not showing in dashboard

**Solution**:
1. Check database: `SELECT * FROM mcp_connections WHERE name = 'task-trellis-mcp'`
2. Verify import ran successfully
3. Check dashboard API: `curl http://localhost:3000/api/mcps`

## Monitoring & Health

### Health Status

Since Trellis uses stdio transport, health checks return `UNKNOWN` by default. To verify:

```bash
# Test command directly
npx -y @task-trellis/mcp-server --help

# Check database status
SELECT name, status, last_health_check FROM mcp_connections WHERE name = 'task-trellis-mcp'
```

### Logs

Check A.T.L.A.S. audit logs for Trellis usage:

```sql
SELECT * FROM audit_logs 
WHERE tool LIKE 'trellis_%' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Upgrading

To upgrade to latest Trellis version:

```bash
# If using npx (default), it automatically uses latest
npx -y @task-trellis/mcp-server --version

# If installed globally, update
npm update -g @task-trellis/mcp-server

# Clear npx cache to force fresh install
npx clear-npx-cache
```

## Uninstalling

To remove Trellis MCP:

```sql
-- Remove from database
DELETE FROM mcp_permissions WHERE mcp_connection_id IN (
  SELECT id FROM mcp_connections WHERE name = 'task-trellis-mcp'
);
DELETE FROM mcp_connections WHERE name = 'task-trellis-mcp';
```

Or use the dashboard to remove the connection.

## Security Considerations

1. **File Access**: Trellis has access to project and trellis folders
2. **Path Validation**: Ensure paths don't escape project boundaries
3. **Permissions**: Limit agent access based on roles
4. **Version Control**: `.trellis/` folder can be committed to git
5. **Sensitive Data**: Don't store credentials in task descriptions

## Additional Resources

- [Task Trellis Documentation](https://github.com/task-trellis/mcp-server)
- [MCP Specification](https://modelcontextprotocol.io)
- [A.T.L.A.S. MCP Documentation](./MCP_SERVERS.md)

## Support

For issues with:
- **Trellis MCP**: Open issue at task-trellis/mcp-server
- **A.T.L.A.S. Integration**: Open issue at A.T.L.A.S repository
- **Configuration**: See [MCP_SERVERS.md](./MCP_SERVERS.md)
