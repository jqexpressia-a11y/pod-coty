# Repo-Mediated Manus ↔ Claude Code Bridge Architecture

**Author:** Manus AI  
**Repository:** `podcity`  
**Status:** Initial bridge specification  

## Purpose

This repository uses the Git history and a structured `pods/` directory as the **communication channel** between Manus and Claude Code. Instead of asking the two agents to converse directly, Manus writes planning artifacts into the repository, commits the state change, and a local Git hook can then hand the committed task pod to Claude Code for implementation. Claude Code acts as the specialist developer that reads the task, follows the repo rules, creates or updates a feature branch, edits code, and commits its implementation back to the repository.

This approach makes every handoff inspectable, replayable, and recoverable because the durable interface is the repository state itself. The Git documentation defines hooks as programs placed in a hooks directory that trigger actions at defined points in Git execution, and it specifically describes `post-commit` as a hook invoked after a commit has been made.[1] Claude Code’s CLI reference documents non-interactive execution through `claude -p`, which is the command shape used by this bridge when dispatch is enabled.[2]

> Git’s hook model is used here as the bridge: Manus produces a commit containing a task pod, and the local `post-commit` hook observes the repository state after that commit.

## Repository Layout

The bridge follows the project-root layout requested for this workspace. The `pods/` folder is the agent-to-agent channel, while `.claude/` holds local bridge scripts, configuration, schemas, and logs.

| Path | Owner | Purpose |
|---|---|---|
| `.claude/` | Claude Code / local bridge | Stores bridge configuration, helper scripts, hook templates, schemas, and logs. |
| `CLAUDE.md` | Repository maintainers | Defines master rules, implementation constraints, and spec-driven behavior for Claude Code. |
| `ARCHITECTURE_SPECS.md` | Manus | Captures architecture, lifecycle, and operating model for the bridge. |
| `pods/inbox/` | Manus | Receives new `task.json` pods that describe work Claude Code should implement. |
| `pods/active/` | Bridge / Claude Code | Stores the task currently being processed. |
| `pods/archive/` | Bridge / Claude Code | Stores completed, skipped, or failed task pods with result metadata. |

## Task Pod Lifecycle

A task pod is a JSON file written into `pods/inbox/`. Manus creates or updates the task pod, commits it, and lets Git provide the transition signal. The bridge script then moves the task through the lifecycle folders and can invoke Claude Code if local dispatch is enabled.

| State | Folder | Meaning | Transition |
|---|---|---|---|
| `queued` | `pods/inbox/` | Manus has produced a task and committed it. | A hook or manual bridge command claims it. |
| `active` | `pods/active/` | The bridge is processing the task. | Claude Code completes, fails, or is skipped. |
| `completed` | `pods/archive/` | Claude Code created an implementation commit. | Human review or merge follows. |
| `failed` | `pods/archive/` | The task could not run, usually because tooling is missing or command execution failed. | Manus or a human can write a follow-up task. |
| `skipped` | `pods/archive/` | Dispatch is disabled or no matching task exists. | No implementation action is taken. |

## Branching and Commit Model

The default implementation branch naming convention is `claude/<task_id>`. If the bridge is already on another branch or if a task specifies a `branch` field, the script should use the explicit task branch. Manus commits planning artifacts on `main` unless otherwise specified. Claude Code commits implementation artifacts on a feature branch so the user can review the diff before merging.

| Actor | Branch | Commit Type | Example Message |
|---|---|---|---|
| Manus | `main` | Planning/spec/task commit | `manus: add pod task <task_id>` |
| Bridge | local only | Task claiming and lifecycle metadata | `bridge: activate pod <task_id>` |
| Claude Code | `claude/<task_id>` | Implementation commit | `claude: implement <task_title>` |

## Task Pod Format

Each task pod is a single JSON document. The bridge validates only the fields needed for safe dispatch, while Claude Code reads the full body for implementation context.

| Field | Type | Required | Description |
|---|---:|---:|---|
| `schema_version` | string | Yes | Current schema version, initially `1.0`. |
| `task_id` | string | Yes | Stable identifier such as `pod-20260530-001`. |
| `title` | string | Yes | Human-readable title. |
| `status` | string | Yes | One of `queued`, `active`, `completed`, `failed`, or `skipped`. |
| `created_by` | string | Yes | Usually `manus`. |
| `created_at` | string | Yes | ISO 8601 timestamp. |
| `branch` | string | No | Desired implementation branch, defaulting to `claude/<task_id>`. |
| `priority` | string | No | `low`, `normal`, `high`, or `urgent`. |
| `spec_files` | array | No | Files Claude Code should read before acting. |
| `acceptance_criteria` | array | Yes | Testable requirements that define completion. |
| `implementation_notes` | string | No | Additional context from Manus. |
| `allowed_paths` | array | No | Paths Claude Code may modify. |
| `forbidden_paths` | array | No | Paths Claude Code must not modify. |

## Dispatch Safety

The installed hook is intentionally **non-blocking**. Git documents `post-commit` as a notification-style hook that runs after the commit is already made; therefore, bridge failures should be logged rather than used to reject commits.[1] This repository’s hook calls `.claude/scripts/Invoke-ClaudePod.ps1`, which detects whether dispatch is enabled and whether the `claude` command is available. If either condition fails, the hook writes a log message and exits successfully so normal Git work is not interrupted.

| Safety Control | Default | Reason |
|---|---:|---|
| `enabled` in `.claude/pod-bridge.local.json` | `false` | Prevents accidental autonomous implementation loops. |
| `dry_run_default` | `true` | Allows safe validation of task discovery and prompt construction. |
| Claude CLI detection | Required | Prevents hook failures when Claude Code is not installed or not on PATH. |
| Log file output | Enabled | Preserves local traceability without blocking commits. |
| Active-task lock | Enabled by folder move | Prevents repeated processing of the same queued pod. |

## Manual Operation

After installation, the user can test the bridge without invoking Claude Code by running a dry run from PowerShell:

```powershell
Set-Location C:\Users\johnw\OneDrive\Desktop\podcity
.\.claude\scripts\Invoke-ClaudePod.ps1 -DryRun
```

When Claude Code is installed and visible on PATH, the user can enable local dispatch by copying `.claude/pod-bridge.example.json` to `.claude/pod-bridge.local.json` and setting `enabled` to `true`. A one-time run can then be triggered manually:

```powershell
.\.claude\scripts\Invoke-ClaudePod.ps1 -RunOnce
```

## References

[1]: https://git-scm.com/docs/githooks "Git - githooks Documentation"  
[2]: https://docs.anthropic.com/en/docs/claude-code/cli-reference "Claude Code CLI Reference"
