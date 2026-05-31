#!/usr/bin/env bash
set -euo pipefail

# n8n Execute Command example:
# /path/to/n8n_call_openclaw_pm.sh "{{$json.task_message}}"

WRAPPER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MESSAGE="${*:-}"

if [[ -z "$MESSAGE" ]]; then
  echo '{"error":"missing message"}'
  exit 64
fi

"$WRAPPER_DIR/scripts/run_openclaw_pm_turn.sh" "$MESSAGE"
