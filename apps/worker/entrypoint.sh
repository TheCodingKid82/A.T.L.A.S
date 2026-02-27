#!/bin/bash
set -e

# Authenticate Claude Code CLI using OAuth setup token
if [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
  echo "[C.O.D.E.] Authenticating Claude Code CLI with OAuth token..."
  echo "$CLAUDE_CODE_OAUTH_TOKEN" | claude setup-token 2>&1 || echo "[C.O.D.E.] Warning: setup-token returned non-zero exit code"
  echo "[C.O.D.E.] Claude Code CLI authentication complete"
fi

# Start the worker
exec node apps/worker/dist/worker.js
