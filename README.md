# Pod City

Ghost AI prompt optimizer docs and agent skills for the Pod City / Pod Coty project.

## Greploop

Automated PR review loop: trigger Greptile → fix comments → push → repeat until **5/5** confidence.

- **Cursor skill:** `.cursor/skills/greploop/` (also installed at `%USERPROFILE%\.cursor\skills\greploop\`)
- **Requires:** Git, GitHub CLI (`gh`), Greptile on the repo
- **Usage in Cursor:** ask *"run greploop"* or *"greploop this PR"*

See [references/windows-setup.md](.cursor/skills/greploop/references/windows-setup.md) for setup.

Each greploop iteration saves artifacts under `.claude/artifacts/greploop/pr-<number>/`.

## Pod bridge (Python)

Watches `pods/inbox/` and dispatches headless Claude Code with durable artifacts:

```powershell
cd C:\Users\johnw\OneDrive\Desktop\podcity
pip install -r .claude/requirements.txt
python .claude/scripts/bridge.py --dry-run --once
python .claude/scripts/bridge.py --once
```

Artifacts are written to `.claude/artifacts/<task_id>/<run_id>/` and linked from the archived task pod `result.artifacts`.

## Manus ↔ Claude Code Pod Bridge

This repo now includes a repo-mediated bridge where Manus writes implementation requests as JSON task pods and Claude Code consumes those pods from the local workspace. The communication channel is the repository itself, not a direct agent-to-agent conversation.

| Path | Description |
|------|-------------|
| `.claude/` | Claude Code bridge configuration, hook templates, scripts, schemas, and logs. |
| `CLAUDE.md` | Master rules and spec-driven constraints for Claude Code. |
| `ARCHITECTURE_SPECS.md` | Architecture and task lifecycle specification for the bridge. |
| `pods/inbox/` | Manus writes queued `task.json` pods here. |
| `pods/active/` | The bridge places the currently processing task here. |
| `pods/archive/` | Completed, skipped, or failed task pods are archived here. |

Install the local hook with PowerShell:

```powershell
.\.claude\scripts\Install-PodBridgeHook.ps1
```

Run a safe dry run without invoking Claude Code:

```powershell
.\.claude\scripts\Invoke-ClaudePod.ps1 -DryRun
```

## Files

| File | Description |
|------|-------------|
| `notebooklm_system_instructions.md` | Prompt optimizer system instructions |
| `notebooklm_example_pairs.md` | Example input/output pairs |
