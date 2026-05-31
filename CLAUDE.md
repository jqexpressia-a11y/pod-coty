# CLAUDE.md

This repository uses a **spec-driven pod bridge**. Claude Code should treat repository files as the only authoritative communication channel. Do not assume private chat context exists unless it has been written into this repository.

## Operating Role

Claude Code is the **specialist developer** in this workflow. Manus is the autonomous planner that writes architecture, task pods, and acceptance criteria. Claude Code implements the requested change by reading the committed repo state, making code or documentation edits, and committing the result to an implementation branch.

## Required Reading Order

Before changing files, Claude Code must read the following artifacts when they exist:

| Order | File or Folder | Purpose |
|---:|---|---|
| 1 | `CLAUDE.md` | Master rules and repository constraints. |
| 2 | `ARCHITECTURE_SPECS.md` | System architecture and task lifecycle. |
| 3 | `pods/active/*.json` | The currently claimed task pod. |
| 4 | `pods/inbox/*.json` | Queued task pods if no active task exists. |
| 5 | `README.md` | Existing project context. |

## Task Pod Rules

Claude Code must process task pods conservatively. A pod is valid only if it contains a `task_id`, `title`, `status`, and `acceptance_criteria`. If `allowed_paths` is present, only those paths may be modified. If `forbidden_paths` is present, those paths must not be modified.

When starting work, move or copy the task into `pods/active/` and set `status` to `active` if the bridge script has not already done so. When work is complete, update the pod status to `completed` and archive it under `pods/archive/`. If implementation fails, archive the pod with `status` set to `failed` and include a concise `result.error` field.

## Branching Rules

Claude Code should implement work on a feature branch. The default branch name is `claude/<task_id>`, unless the task pod includes a `branch` value. Do not commit implementation work directly to `main` unless the task pod explicitly requires it.

## Commit Rules

Each implementation commit should be small, reviewable, and tied to a task pod. The recommended commit message format is:

```text
claude: implement <task_id> <short title>
```

If only lifecycle metadata is changed, use:

```text
bridge: update pod <task_id>
```

## Quality Rules

Claude Code should prefer deterministic, local checks before committing. If the repository contains tests, linting, or type-checking commands, run the relevant checks. If no test command exists, state that explicitly in the archived pod result. Do not invent passing test results.

## Safety Rules

Do not expose secrets, tokens, cookies, or private machine paths in commits. Do not make network calls, install dependencies, or run destructive commands unless the task pod explicitly requires it or the user has approved it. Do not modify `.git/` directly; use the bridge scripts and Git commands.

## Output Expectations

At completion, the repository should show a clear implementation diff, an archived task pod with result metadata, and a commit on the appropriate feature branch. If the task cannot be completed, the archived pod must explain the blocker and preserve enough detail for Manus or the user to create a follow-up task.
