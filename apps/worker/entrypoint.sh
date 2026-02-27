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

# Diagnostics
echo "[C.O.D.E.] HOME=$HOME"
echo "[C.O.D.E.] Claude Code CLI version:"
claude --version 2>&1 || echo "[C.O.D.E.] claude --version failed"
echo "[C.O.D.E.] Credentials file exists: $(test -f ~/.claude/.credentials.json && echo YES || echo NO)"
echo "[C.O.D.E.] Testing CLI auth (quick hello)..."
claude --print "say hello" --output-format text 2>&1 | head -20 || echo "[C.O.D.E.] CLI test exited with code $?"

# Start the worker
exec node apps/worker/dist/worker.js
