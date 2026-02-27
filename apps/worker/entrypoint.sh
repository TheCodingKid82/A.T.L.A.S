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

echo "[C.O.D.E.] Claude Code CLI version: $(claude --version 2>&1 || echo 'unknown')"

# Start the worker
exec node apps/worker/dist/worker.js
