# Task Trellis MCP - Quick Start Guide

Get up and running with Task Trellis MCP in A.T.L.A.S. in under 5 minutes.

## ⚡ Quick Start

### 1. Prerequisites Check

```bash
# Verify Node.js and pnpm
node --version   # Should be >= 18.0.0
pnpm --version   # Should be >= 9.0.0

# Verify A.T.L.A.S. is set up
pnpm run db:studio  # Should open Prisma Studio
```

### 2. Import Trellis MCP

```bash
# From A.T.L.A.S. root directory

# Dry run to verify configuration
pnpm run mcp:import:dry

# Import Trellis MCP
pnpm run mcp:import:trellis
```

**Expected output**:
```
╔══════════════════════════════════════════════════╗
║      A.T.L.A.S. MCP Server Import Script        ║
╚══════════════════════════════════════════════════╝

📖 Loaded configuration version 1.0.0
📋 Found 1 server(s) in config

✅ Added MCP server: task-trellis-mcp (id: clxx...)
   ✅ Added permissions for H.E.N.R.Y.: 1 tools
   ✅ Added permissions for P.O.K.E.: 1 tools
   ✅ Added permissions for I.R.I.S.: 2 tools

✨ Import complete!
```

### 3. Configure Project Paths

Before using Trellis, you need to specify where your project files are located.

**Option A: Update the configuration (recommended for multiple projects)**

Edit `config/mcp-servers.json`:

```json
{
  "servers": [
    {
      "name": "task-trellis-mcp",
      "args": [
        "-y",
        "@task-trellis/mcp-server",
        "/path/to/your/project",        // ← Update this
        "/path/to/your/project/.trellis" // ← Update this
      ]
    }
  ]
}
```

**Option B: Use environment variables**

Add to `.env`:

```bash
TRELLIS_PROJECT_FOLDER="/path/to/your/project"
TRELLIS_FOLDER="/path/to/your/project/.trellis"
```

Then update args to use these:
```json
"args": ["-y", "@task-trellis/mcp-server", "${TRELLIS_PROJECT_FOLDER}", "${TRELLIS_FOLDER}"]
```

### 4. Verify Installation

**Check in Dashboard**:
```bash
# Start the dashboard (if not already running)
pnpm --filter @atlas/dashboard dev

# Open in browser
open http://localhost:3000/mcps
```

You should see:
- ✅ **task-trellis-mcp** listed
- Status: UNKNOWN (normal for stdio transport)
- Permissions: H.E.N.R.Y., P.O.K.E., I.R.I.S.

**Check via API**:
```bash
curl http://localhost:3000/api/mcps | jq '.[] | select(.name == "task-trellis-mcp")'
```

**Check Database**:
```sql
-- Open Prisma Studio
pnpm run db:studio

-- Or query directly
SELECT name, transport, status FROM mcp_connections WHERE name = 'task-trellis-mcp';
```

### 5. Test the Integration

The Trellis MCP uses stdio transport, which means it's launched as a child process when needed. To verify it works:

```bash
# Test the command directly
npx -y @task-trellis/mcp-server --help

# Should show Trellis MCP help information
```

## 🎯 Usage Examples

### Example 1: H.E.N.R.Y. Creates a Business Task

From your AI client connected to H.E.N.R.Y.:

```
"I need to create a task for reviewing Q1 financials"
```

H.E.N.R.Y. will:
1. Call `atlas_mcp_list` to see available MCPs
2. Call `trellis_create_task` with appropriate parameters
3. Confirm task creation

### Example 2: P.O.K.E. Lists Personal Tasks

```
"Show me my personal tasks"
```

P.O.K.E. will:
1. Call `trellis_list_tasks` with personal project filter
2. Display tasks in organized format

### Example 3: I.R.I.S. Searches for Tasks

```
"Find tasks related to grocery shopping"
```

I.R.I.S. will:
1. Call `trellis_search_tasks` with query
2. Show matching tasks (read-only)

## 📁 File Structure Created

After first use, Trellis creates:

```
your-project/
├── .trellis/
│   ├── config.json          # Trellis configuration
│   ├── tasks/               # Task definitions
│   ├── projects/            # Project metadata
│   └── index.json           # Task index
└── (your project files)
```

**Note**: You can commit `.trellis/` to version control for team collaboration.

## 🔍 Verification Steps

### ✅ Checklist

- [ ] Trellis MCP appears in `pnpm run mcp:import:dry` output
- [ ] Database has entry in `mcp_connections` table
- [ ] Permissions exist for agents in `mcp_permissions` table
- [ ] Dashboard shows Trellis MCP at `/mcps` route
- [ ] `npx -y @task-trellis/mcp-server --help` runs successfully
- [ ] Project and Trellis folders exist and are accessible

### 🐛 Common Issues

**Issue**: "Server already exists"
```bash
# Solution: Already imported, you're good to go!
# Or remove and re-import:
pnpm tsx scripts/add-mcp-servers.ts --server=task-trellis-mcp
```

**Issue**: "Agent not found"
```bash
# Solution: Run database seed
pnpm run db:seed
```

**Issue**: "Cannot find package @task-trellis/mcp-server"
```bash
# Solution: npx will auto-install, or install manually
npm install -g @task-trellis/mcp-server
```

**Issue**: ".trellis folder not created"
```bash
# Solution: Create manually
mkdir -p /path/to/project/.trellis
```

## 🔄 Next Steps

### 1. Customize Permissions

Edit permissions in `config/mcp-servers.json`:

```json
{
  "permissions": {
    "henry": ["trellis_*"],              // Full access
    "poke": ["trellis_*"],               // Full access
    "iris": ["trellis_read_*"]           // Read-only
  }
}
```

Then re-import:
```bash
pnpm run mcp:import:trellis
```

### 2. Add More Projects

You can add multiple Trellis instances for different projects:

```json
{
  "servers": [
    {
      "name": "trellis-work",
      "command": "npx",
      "args": ["-y", "@task-trellis/mcp-server", "/work/project", "/work/project/.trellis"]
    },
    {
      "name": "trellis-personal",
      "command": "npx",
      "args": ["-y", "@task-trellis/mcp-server", "/personal", "/personal/.trellis"]
    }
  ]
}
```

### 3. Explore Trellis Features

- Task dependencies
- Project organization
- Tag-based filtering
- Due date management
- Priority levels

See [TRELLIS_MCP.md](./TRELLIS_MCP.md) for detailed features.

### 4. Monitor Usage

Check audit logs to see how agents use Trellis:

```sql
SELECT 
  a.name,
  al.tool,
  al.created_at
FROM audit_logs al
JOIN agents a ON al.agent_id = a.id
WHERE al.tool LIKE 'trellis_%'
ORDER BY al.created_at DESC
LIMIT 20;
```

## 📚 Additional Resources

- [Full MCP Integration Guide](./MCP_SERVERS.md)
- [Trellis MCP Documentation](./TRELLIS_MCP.md)
- [Task Trellis Package](https://www.npmjs.com/package/@task-trellis/mcp-server)
- [Model Context Protocol](https://modelcontextprotocol.io)

## 💡 Pro Tips

1. **Commit `.trellis/`** to git for team collaboration
2. **Use project-specific paths** for better organization
3. **Monitor audit logs** to understand usage patterns
4. **Combine with Kanban** - Use both systems for different purposes
5. **Set up aliases** in your shell:
   ```bash
   alias atlas-mcp-import="pnpm run mcp:import"
   alias atlas-mcp-check="pnpm run mcp:import:dry"
   ```

## 🎉 You're Ready!

Trellis MCP is now integrated with A.T.L.A.S. Your agents can use advanced task management features alongside the built-in Kanban board.

**Test it out**:
- Ask H.E.N.R.Y. to create a business task
- Ask P.O.K.E. to list personal tasks
- Ask I.R.I.S. to search for specific tasks

Happy task managing! 🚀
