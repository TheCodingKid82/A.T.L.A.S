#!/bin/bash
set -e

# Authenticate Claude Code CLI by writing credentials file directly
# The setup-token command requires an interactive terminal which doesn't
# exist in Docker. Instead, write the credentials file that Claude Code
# reads at startup.
if [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
  echo "[C.O.D.E.] Writing Claude Code OAuth credentials..."
  mkdir -p ~/.claude
  cat > ~/.claude/.credentials.json << CREDS
{
  "claudeAiOauth": {
    "accessToken": "$CLAUDE_CODE_OAUTH_TOKEN",
    "expiresAt": 9999999999999,
    "scopes": ["user:inference", "user:profile"],
    "subscriptionType": "max"
  }
}
CREDS
  echo "[C.O.D.E.] Claude Code CLI credentials configured"
fi

# Start the worker
exec node apps/worker/dist/worker.js
