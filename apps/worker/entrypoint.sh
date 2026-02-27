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

echo "[C.O.D.E.] Claude Code CLI version: $(claude --version 2>&1 || echo 'unknown')"

# Start the worker
exec node apps/worker/dist/worker.js
