#!/bin/bash
set -e

# Claude credentials are persisted via a Railway volume at /root/.claude
# SSH in and run `claude` to log in interactively — credentials survive redeploys.
if [ -f ~/.claude/.credentials.json ]; then
  echo "[C.O.D.E.] Found existing Claude Code credentials (persistent volume)"
else
  echo "[C.O.D.E.] No credentials found at ~/.claude/.credentials.json"
  echo "[C.O.D.E.] SSH into this container and run 'claude' to log in."
fi

# Restore .claude.json config from volume backup if missing
# The CLI stores config at ~/.claude.json (outside the volume mount)
# which gets wiped on redeploy. Copy it back from the volume backup.
if [ ! -f ~/.claude.json ]; then
  BACKUP=$(ls -t ~/.claude/backups/.claude.json.backup.* 2>/dev/null | head -1)
  if [ -n "$BACKUP" ]; then
    cp "$BACKUP" ~/.claude.json
    echo "[C.O.D.E.] Restored .claude.json from volume backup"
  fi
fi

# Configure MCP servers in ~/.claude.json so Claude CLI can access them.
# NOTE: --mcp-config flag hangs in --print mode, but servers in ~/.claude.json
# use the same loading path as account-synced servers, which work fine.
node -e "
const fs = require('fs');
const path = require('path');
const configPath = path.join(require('os').homedir(), '.claude.json');

let config = {};
try { config = JSON.parse(fs.readFileSync(configPath, 'utf-8')); } catch {}

const mcpServers = {};

// ATLAS MCP server
if (process.env.ATLAS_MCP_URL && process.env.WORKER_API_KEY) {
  mcpServers.atlas = {
    type: 'url',
    url: process.env.ATLAS_MCP_URL,
    headers: { Authorization: 'Bearer ' + process.env.WORKER_API_KEY }
  };
}

// Zapier MCP server
if (process.env.ZAPIER_MCP_TOKEN) {
  mcpServers.zapier = {
    type: 'url',
    url: 'https://mcp.zapier.com/api/v1/connect',
    headers: { Authorization: 'Bearer ' + process.env.ZAPIER_MCP_TOKEN }
  };
}

if (Object.keys(mcpServers).length > 0) {
  config.mcpServers = { ...(config.mcpServers || {}), ...mcpServers };
}

// Enable Remote Control for all sessions so workers can be monitored from phone/browser
config.remoteControlAtStartup = true;
config.remoteDialogSeen = true;

// Enable bridge daemon feature flag for 'claude remote-control'
config.cachedGrowthBookFeatures = config.cachedGrowthBookFeatures || {};
config.cachedGrowthBookFeatures.tengu_ccr_bridge = true;

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

if (Object.keys(mcpServers).length > 0) {
  console.log('[C.O.D.E.] Configured MCP servers in ~/.claude.json:', Object.keys(mcpServers).join(', '));
} else {
  console.log('[C.O.D.E.] Warning: No MCP server credentials found — skipping MCP config');
}
console.log('[C.O.D.E.] Remote Control enabled for all sessions');
"

# Configure tool permissions — allow all tools since the worker is non-interactive.
# This is written to the persistent volume so it survives redeploys.
node -e "
const fs = require('fs');
const path = require('path');
const settingsPath = path.join(require('os').homedir(), '.claude', 'settings.json');

let settings = {};
try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')); } catch {}

// Allow all tool patterns for the worker
settings.permissions = settings.permissions || {};
settings.permissions.allow = [
  'Bash(*)',
  'Read(*)',
  'Write(*)',
  'Edit(*)',
  'Glob(*)',
  'Grep(*)',
  'WebFetch(*)',
  'WebSearch(*)',
  'mcp__*(*)',
  'Task(*)',
  'NotebookEdit(*)'
];

// Skip the confirmation prompt for dangerous mode
settings.skipDangerousModePermissionPrompt = true;

fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
console.log('[C.O.D.E.] Configured tool permissions in ~/.claude/settings.json');
console.log('[C.O.D.E.] Settings:', JSON.stringify(settings, null, 2));
"

# Verify CLI auth
if [ -n "$GH_TOKEN" ]; then
  echo "[C.O.D.E.] GitHub CLI auth: GH_TOKEN is set"
else
  echo "[C.O.D.E.] Warning: GH_TOKEN not set — gh commands will fail"
fi

if [ -n "$RAILWAY_API_TOKEN" ]; then
  echo "[C.O.D.E.] Railway CLI auth: RAILWAY_API_TOKEN is set"
else
  echo "[C.O.D.E.] Warning: RAILWAY_API_TOKEN not set — railway commands will fail"
fi

echo "[C.O.D.E.] Claude Code CLI version: $(claude --version 2>&1 || echo 'unknown')"

# Start Remote Control bridge daemon in background
# This registers the worker as a "bridge environment" with Anthropic's cloud,
# allowing interactive sessions from claude.ai/code or the Claude mobile app.
echo "[C.O.D.E.] Starting Remote Control bridge daemon..."
claude remote-control > /tmp/remote-control.log 2>&1 &
RC_PID=$!
echo "[C.O.D.E.] Remote Control bridge started (PID: $RC_PID)"

# Give it a few seconds to register, then check if it's still running
sleep 3
if kill -0 $RC_PID 2>/dev/null; then
  echo "[C.O.D.E.] Remote Control bridge is running"
else
  echo "[C.O.D.E.] Warning: Remote Control bridge exited — check /tmp/remote-control.log"
  cat /tmp/remote-control.log
fi

# Start the worker (not exec — keep bridge daemon alive)
node apps/worker/dist/worker.js
