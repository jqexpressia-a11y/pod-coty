# Claude Pod Bridge

This folder contains the local bridge that lets Manus and Claude Code coordinate through repository state rather than direct agent-to-agent messages.

The bridge is intentionally conservative. It discovers queued JSON task pods in `pods/inbox/`, can claim one into `pods/active/`, and can invoke Claude Code only when local dispatch is explicitly enabled.

| Path | Purpose |
|---|---|
| `pod-bridge.example.json` | Versioned configuration template. Copy to `pod-bridge.local.json` for local settings. |
| `hooks/post-commit` | Hook template that calls the bridge after commits. |
| `scripts/Invoke-ClaudePod.ps1` | Main PowerShell task discovery and dispatch script. |
| `scripts/Install-PodBridgeHook.ps1` | Installs the hook template into `.git/hooks/post-commit`. |
| `schemas/pod-task.schema.json` | JSON schema for task pods. |
| `templates/pod-task.example.json` | Safe template for new task pods. |
| `logs/` | Local logs; log files are ignored by Git. |

To enable real Claude Code dispatch, copy `pod-bridge.example.json` to `pod-bridge.local.json`, change `enabled` to `true`, ensure the `claude` command is on PATH, and then run `scripts/Install-PodBridgeHook.ps1`.
