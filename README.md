# A.T.L.A.S. 🤖

**Automated Task Logic and Agent Supervision**

A multi-agent AI orchestration system built on the Model Context Protocol (MCP), enabling seamless coordination between specialized AI agents.

## 🌟 Features

- **Multi-Agent System**: Three specialized agents (H.E.N.R.Y., P.O.K.E., I.R.I.S.) working together
- **MCP Server**: 33 built-in tools across 7 categories
- **External MCP Integration**: Connect to external MCP servers (GitHub, Trellis, etc.)
- **Task Management**: Built-in Kanban board + Task Trellis integration
- **Memory System**: Shared knowledge via Supermemory
- **Inter-Agent Messaging**: Channels and DMs for agent communication
- **Document Management**: Collaborative document creation and versioning
- **Browser Automation**: Web scraping and automation capabilities
- **Permission System**: Fine-grained access control per agent
- **Dashboard**: Web UI for monitoring and management

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                 A.T.L.A.S. Agents                   │
│   H.E.N.R.Y. | P.O.K.E. | I.R.I.S.                 │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│            A.T.L.A.S. MCP Server (Port 3001)        │
│                                                      │
│  ┌──────────────────┐  ┌──────────────────────┐   │
│  │  Internal Tools  │  │  External MCPs       │   │
│  │  • Agents        │  │  • Task Trellis      │   │
│  │  • Tasks         │  │  • GitHub            │   │
│  │  • Memory        │  │  • Custom MCPs       │   │
│  │  • Messages      │  └──────────────────────┘   │
│  │  • Documents     │                              │
│  │  • Browser       │                              │
│  │  • MCP Registry  │                              │
│  └──────────────────┘                              │
└─────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│         PostgreSQL Database + Supermemory           │
└─────────────────────────────────────────────────────┘
```

## 📦 Repository Structure

```
A.T.L.A.S/
├── apps/
│   ├── dashboard/          # Next.js web dashboard
│   └── mcp-server/         # MCP server implementation
├── packages/
│   ├── database/           # Prisma schema & migrations
│   ├── services/           # Business logic layer
│   └── shared/             # Shared utilities
├── config/                 # MCP server configurations
│   ├── mcp-servers.json    # MCP server definitions
│   └── mcp-servers.schema.json
├── docs/                   # Documentation
│   ├── MCP_SERVERS.md      # MCP integration guide
│   └── TRELLIS_MCP.md      # Trellis MCP documentation
├── scripts/                # Utility scripts
│   ├── setup.sh            # Initial setup script
│   ├── generate-api-key.ts # API key generation
│   └── add-mcp-servers.ts  # Import MCP configurations
└── docker-compose.yml      # PostgreSQL setup
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 9.0.0
- Docker (for PostgreSQL)

### Installation

1. **Clone the repository**:

```bash
git clone https://github.com/TheCodingKid82/A.T.L.A.S.git
cd A.T.L.A.S
```

2. **Run the setup script**:

```bash
pnpm run setup
```

This will:
- Install dependencies
- Start PostgreSQL with Docker
- Run database migrations
- Seed the database with agents
- Generate API keys (save these!)

3. **Configure environment variables**:

Edit `.env` with your API keys:

```bash
SUPERMEMORY_API_KEY="your-api-key"
ENCRYPTION_KEY="generate-with-openssl-rand-hex-32"
```

4. **Start the services**:

```bash
# Terminal 1: MCP Server
pnpm --filter @atlas/mcp-server dev

# Terminal 2: Dashboard
pnpm --filter @atlas/dashboard dev
```

5. **Access the dashboard**:

Open [http://localhost:3000](http://localhost:3000)

## 🤖 Agents

### H.E.N.R.Y. (Business AI)
**Helpful Executive for Networking, Research & Yielding results**
- Business operations
- Research and analysis
- Full system access

### P.O.K.E. (Personal AI)
**Personal Organizer for Knowledge & Errands**
- Personal task management
- Knowledge organization
- Full system access

### I.R.I.S. (Smart Glasses AI)
**Intelligent Reality Interface System**
- Quick information lookup
- Read-only access
- Limited permissions

## 🔧 MCP Integration

A.T.L.A.S. supports external MCP servers through a database-driven configuration system.

### Adding External MCP Servers

1. **Configure in `config/mcp-servers.json`**:

```json
{
  "servers": [
    {
      "name": "task-trellis-mcp",
      "enabled": true,
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@task-trellis/mcp-server", "{{projectFolder}}", "{{trellisFolder}}"],
      "permissions": {
        "henry": ["trellis_*"],
        "poke": ["trellis_*"]
      }
    }
  ]
}
```

2. **Import to database**:

```bash
# Dry run first
pnpm run mcp:import:dry

# Import all configured servers
pnpm run mcp:import

# Import specific server
pnpm run mcp:import:trellis
```

3. **Verify in dashboard**:

Visit [http://localhost:3000/mcps](http://localhost:3000/mcps)

### Included MCP Servers

- **Task Trellis MCP**: Advanced task management system

See [docs/MCP_SERVERS.md](docs/MCP_SERVERS.md) for detailed integration guide.

## 📚 Documentation

- [MCP Server Integration Guide](docs/MCP_SERVERS.md)
- [Task Trellis MCP Setup](docs/TRELLIS_MCP.md)

## 🛠️ Available Scripts

### Root Package Scripts

```bash
pnpm run dev              # Start all services (turbo)
pnpm run build            # Build all packages
pnpm run lint             # Lint all packages

# Database
pnpm run db:generate      # Generate Prisma client
pnpm run db:migrate       # Run migrations
pnpm run db:seed          # Seed database
pnpm run db:studio        # Open Prisma Studio

# MCP Management
pnpm run mcp:import       # Import all MCP servers
pnpm run mcp:import:dry   # Dry run import
pnpm run mcp:import:trellis  # Import Trellis MCP only

# Setup
pnpm run setup            # Initial setup
```

### Service-Specific Scripts

```bash
# MCP Server
pnpm --filter @atlas/mcp-server dev
pnpm --filter @atlas/mcp-server build
pnpm --filter @atlas/mcp-server start

# Dashboard
pnpm --filter @atlas/dashboard dev
pnpm --filter @atlas/dashboard build
pnpm --filter @atlas/dashboard start
```

## 🔑 API Keys

Agent API keys are generated during seeding. Store them securely:

```bash
# Generate new API key for an agent
pnpm tsx scripts/generate-api-key.ts <agent-slug>
```

## 🗄️ Database Schema

Key models:
- **Agent**: AI agents with API keys and permissions
- **Task**: Kanban-style tasks
- **Message**: Inter-agent communication
- **Document**: Collaborative documents
- **McpConnection**: External MCP server registry
- **McpPermission**: Agent-specific MCP access control
- **MemoryEntry**: Shared knowledge base
- **AuditLog**: Tool usage tracking

## 🔐 Security

- API key authentication for agents
- Rate limiting per agent
- Fine-grained MCP permissions
- AES-256 encryption for credentials
- Audit logging for all tool calls

## 📊 Monitoring

### Dashboard Features
- Agent status monitoring
- Task board visualization
- Message channels
- Memory search
- Document management
- MCP connection health
- Browser session management

### Database Monitoring

```bash
# Open Prisma Studio
pnpm run db:studio
```

### Audit Logs

All tool calls are logged:

```sql
SELECT 
  a.name as agent,
  al.tool,
  al.duration,
  al.created_at
FROM audit_logs al
JOIN agents a ON al.agent_id = a.id
ORDER BY al.created_at DESC
LIMIT 10;
```

## 🧪 Development

### Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **Backend**: Express, Node.js
- **Database**: PostgreSQL, Prisma ORM
- **MCP**: @modelcontextprotocol/sdk
- **Monorepo**: pnpm workspaces, Turborepo

### Project Structure

- **Monorepo**: All packages in single repository
- **Workspaces**: Apps and packages isolated
- **Shared Packages**: Database, services, shared utilities
- **Type Safety**: Full TypeScript coverage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

See [LICENSE](LICENSE) file for details.

## 🔗 Resources

- [Model Context Protocol](https://modelcontextprotocol.io)
- [Task Trellis MCP](https://github.com/task-trellis/mcp-server)
- [Supermemory](https://supermemory.ai)

## 💬 Support

For issues and questions:
- Open an issue in this repository
- Check existing documentation in `/docs`
- Review MCP integration guides

---

Built with ❤️ using the Model Context Protocol
