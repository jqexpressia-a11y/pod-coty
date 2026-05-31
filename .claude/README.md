# Claude Pod Bridge

This folder contains the local bridge configuration for coordinating Manus and Claude Code through repository state rather than direct agent-to-agent messages.

The bridge is intentionally conservative. Manus writes architecture intent to `ARCHITECTURE_SPECS.md` and task specifications to `pods/inbox/`. Claude Code reads the same shared files, processes one claimed task at a time in headless mode, commits successful builds back to Git when local handoff is enabled, and verifies that the configured KVM deployment trigger fired after push.

| Path | Purpose |
|---|---|
| `pod-bridge.example.json` | Versioned configuration template. Copy to `pod-bridge.local.json` for local settings. |
| `pod-bridge.local.json` | Git-ignored local enablement file for dispatch, Git push, and KVM trigger verification. |
| `hooks/post-commit` | Optional hook template that can call the bridge after commits. |
| `scripts/Invoke-ClaudePod.ps1` | Existing PowerShell task discovery and dispatch script. |
| `scripts/bridge.py` | Python watcher/dispatcher with artifact bundles under `.claude/artifacts/`. |
| `scripts/artifact_store.py` | Artifact writer used by the bridge. |
| `scripts/watch_pod_inbox.py` | Thin entrypoint for `bridge.py`. |
| `requirements.txt` | Optional `watchdog` dependency for inbox watching. |
| `schemas/pod-task.schema.json` | JSON schema for task pods. |
| `templates/pod-task.example.json` | Safe template for new task pods. |
| `logs/` | Local logs; log files are ignored by Git. |

## Shared Workflow

The integration uses `ARCHITECTURE_SPECS.md` as the durable shared specification and `pods/inbox/*.json` as the executable task queue. Claude Code must read `CLAUDE.md`, `ARCHITECTURE_SPECS.md`, and the active task pod before making changes.

| Stage | Expected Behavior |
|---|---|
| Manus planning | Manus updates `ARCHITECTURE_SPECS.md` and writes a task pod into `pods/inbox/`. |
| Bridge claim | The bridge moves a queued pod to `pods/active/` and dispatches Claude Code. |
| Claude build | Claude runs in headless `claude -p` mode with bounded turns, constrained tools, and JSON output. |
| Quality gate | The bridge records checks and optional review status. |
| Git handoff | If enabled, the bridge stages approved files, commits, and pushes to the configured remote branch. |
| KVM trigger verification | After push, the bridge verifies the deployment trigger through configured CI, webhook, deployment status, or a local command. |

## Safe Local Enablement

To prepare for real dispatch, copy the versioned template and edit the local file:

```powershell
Set-Location C:\Users\johnw\OneDrive\Desktop\podcity
Copy-Item .\.claude\pod-bridge.example.json .\.claude\pod-bridge.local.json
notepad .\.claude\pod-bridge.local.json
```

Keep `enabled` and `git_handoff.enabled` set to `false` until the dry run shows the expected task, command, Git target, and deployment verification mechanism. The local file is ignored by Git and must not be committed.

A safe read-only Claude Code check is:

```powershell
claude -p "Read CLAUDE.md, ARCHITECTURE_SPECS.md, and the queued task pod in ./pods/inbox. Summarize the implementation plan without modifying files. Return JSON." --allowedTools "Read" --max-turns 3 --output-format json
```

A real headless implementation command should follow this shape after Claude Code is installed and the bridge is implemented:

```powershell
claude -p "Read CLAUDE.md, ARCHITECTURE_SPECS.md, and the active task pod at ./pods/active/task.json. Implement the task, run relevant checks, update the pod result, archive the pod, and return JSON." --allowedTools "Bash,Read,Edit" --max-turns 10 --output-format json
```

## KVM Deployment Handoff

The bridge should not run KVM provisioning directly by default. The safe production path is that a successful Claude build is committed and pushed to Git, and an existing downstream automation deploys from that commit. The bridge must verify that this trigger fired before reporting deployment success.

If the repository does not contain `.github/workflows`, a deployment directory, or another discoverable trigger, configure one of the following in `pod-bridge.local.json` before claiming deployment success:

| Verification Method | Example Use |
|---|---|
| GitHub Actions status | Poll the workflow run for the pushed commit SHA. |
| Deployment status API | Query the deployment service for the commit or branch. |
| Repository webhook evidence | Check that the webhook delivery for the push succeeded. |
| Local verification command | Run a read-only command that confirms the KVM deployment trigger accepted the commit. |

The bridge must report `deployment_trigger_verified: false` if no trigger can be verified.
