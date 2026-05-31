#!/usr/bin/env bash
set -euo pipefail

AGENT_ID="${OPENCLAW_PM_AGENT_ID:-jq-pm}"
SESSION_KEY="${OPENCLAW_PM_SESSION_KEY:-jq-pm-n8n}"
MESSAGE="${*:-}"

if [[ -z "$MESSAGE" ]]; then
  echo "Usage: $0 \"message for jq OpenClaw PM\"" >&2
  exit 64
fi

exec openclaw agent \
  --agent "$AGENT_ID" \
  --session-key "$SESSION_KEY" \
  --message "$MESSAGE" \
  --thinking high \
  --json
