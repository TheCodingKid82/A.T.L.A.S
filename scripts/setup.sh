#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║         A.T.L.A.S. Setup Script                 ║"
echo "  ║   Automated Task Logic and Agent Supervision     ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "Error: pnpm is required. Install with: npm i -g pnpm"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Error: Docker is required"; exit 1; }

# Copy .env if needed
if [ ! -f .env ]; then
  echo "[1/5] Creating .env from .env.example..."
  cp .env.example .env
  echo "  -> .env created. Please update with your actual values."
else
  echo "[1/5] .env already exists, skipping..."
fi

# Install dependencies
echo "[2/5] Installing dependencies..."
pnpm install

# Start PostgreSQL
echo "[3/5] Starting PostgreSQL with Docker..."
docker compose up -d

# Wait for PostgreSQL
echo "  -> Waiting for PostgreSQL to be ready..."
sleep 3

# Run Prisma migrations and generate client
echo "[4/5] Running database migrations..."
cd packages/database
pnpm generate
pnpm migrate
cd ../..

# Seed database
echo "[5/5] Seeding database..."
pnpm db:seed

echo ""
echo "  Setup complete!"
echo ""
echo "  Next steps:"
echo "    1. Review and update .env with your API keys"
echo "    2. Start MCP server:  pnpm --filter @atlas/mcp-server dev"
echo "    3. Start dashboard:   pnpm --filter @atlas/dashboard dev"
echo ""
echo "  Save the API keys printed above — they won't be shown again!"
echo ""
