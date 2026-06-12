# CLAUDE.md

This repository uses a **spec-driven Pod City bridge**. Claude Code must treat repository files as the only authoritative communication channel. Do not assume private chat context exists unless it has been written into this repository.

## Operating Role

Claude Code is the **Pod City Implementation Agent** in this workflow. Claude Code monitors `./pods/inbox/` for task JSON files, reads each task pod and the shared `spec_file` before modifying any files, validates requirements against the existing codebase, implements only the requested scope defined in the task pod, and moves completed task pods through the inbox → active → archive (or failed) lifecycle.

Manus is the architecture agent that writes architecture intent, task pods, and acceptance criteria. Claude Code implements requested changes by reading the committed repository state, making code or documentation edits, running relevant checks, and committing the result back to Git so the configured downstream deployment automation can react to the new commit.

## Shared Source of Truth

Both Manus and Claude Code must use `ARCHITECTURE_SPECS.md` as the shared specification file. Manus writes architecture intent there. Claude Code must read it before modifying code and must not rely only on the JSON task pod when the shared specification contains relevant constraints.

| Artifact | Owner | Required Behavior |
|---|---|---|
| `ARCHITECTURE_SPECS.md` | Manus and maintainers | Durable architecture, lifecycle, safety, and deployment-trigger specification. |
| `pods/inbox/*.json` | Manus | Queue of task specifications waiting for implementation. |
| `pods/active/*.json` | Bridge or Claude Code | Claimed task currently being processed. |
| `pods/archive/*.json` | Bridge or Claude Code | Completed, skipped, or failed task with result metadata. |
| `pods/failed/*.json` | Bridge or Claude Code | Failed task artifacts when the bridge supports a separate failure folder. |
| `.claude/pod-bridge.local.json` | Local operator | Git-ignored local enablement, command, Git handoff, and deployment verification settings. |

## Required Reading Order

Before changing files, Claude Code must read the following artifacts when they exist:

| Order | File or Folder | Purpose |
|---:|---|---|
| 1 | `CLAUDE.md` | Master rules and repository constraints. |
| 2 | `ARCHITECTURE_SPECS.md` | Shared architecture and workflow specification. |
| 3 | `pods/active/*.json` | The currently claimed task pod. |
| 4 | `pods/inbox/*.json` | Queued task pods if no active task exists. |
| 5 | `README.md` | Existing project context. |

If the active task pod contains `spec_file` or `spec_files`, Claude Code must read those paths before editing. If a referenced spec file is missing, Claude Code must fail safely, archive the task with a clear blocker, and avoid code changes.

## Task Pod Rules

Claude Code must process task pods conservatively. A pod is valid only if it contains a `task_id`, `title`, `status`, and `acceptance_criteria`. If `allowed_paths` is present, only those paths may be modified. If `forbidden_paths` is present, those paths must not be modified.

When starting work, move or copy the task into `pods/active/` and set `status` to `active` if the bridge script has not already done so. When work is complete, update the pod status to `completed` and archive it under `pods/archive/`. If implementation fails, archive the pod with `status` set to `failed` and include a concise `result.error` field. If the bridge has implemented `pods/failed/`, failed pods may be moved there instead, but the archived or failed pod must preserve the original task body and failure reason.

## Headless Execution Rules

The preferred automation path is **bounded headless execution** using `claude -p`. Interactive `--watch` mode is not the default bridge mechanism. A bridge or local operator should dispatch one task pod at a time and require machine-readable output.

The expected command shape is:

```powershell
claude -p "Read CLAUDE.md, ARCHITECTURE_SPECS.md, and the active task pod at <task_path>. Implement the task on branch <branch>. Respect allowed_paths and forbidden_paths. Run relevant checks, update and archive the task pod, commit approved changes, and return structured JSON." --allowedTools "Bash,Read,Edit" --max-turns 10 --output-format json
```

The `--dangerously-skip-permissions` flag must not be used by default. It may be enabled only through explicit local, git-ignored configuration after the operator accepts the risk. Do not commit that setting to the repository.

## Branching Rules

Claude Code should implement work on a feature branch. The default branch name is `claude/<task_id>`, unless the task pod includes a `branch` value. Do not commit implementation work directly to `main` unless the task pod explicitly requires it and the local bridge configuration allows it.

## Commit and Push Rules

Each implementation commit should be small, reviewable, and tied to a task pod. The recommended commit message format is:

```text
claude: implement <task_id> <short title>
```

If only lifecycle metadata is changed, use:

```text
bridge: update pod <task_id>
```

After implementation succeeds and local quality gates pass, the bridge may stage, commit, and push approved files only when Git handoff is enabled in local configuration. Before pushing, Claude Code or the bridge must verify the target remote and branch, ensure the diff excludes secrets, logs, local configuration, generated credentials, and unrelated user changes, and record the commit SHA in the task result.

## KVM Deployment Trigger Rules

The KVM deployment is a **downstream Git-triggered automation**, not a direct infrastructure command run by Claude Code. After a real push, the bridge must verify the deployment trigger through one configured mechanism, such as GitHub Actions status, deployment status, a repository webhook confirmation, or a local verification command. If no deployment trigger can be discovered or verified, the task result must state `deployment_trigger_verified: false` and must not claim that KVM deployment succeeded.

Claude Code must not run `terraform apply`, Ansible playbooks, SSH deployment commands, or KVM provisioning commands unless the task pod and local operator configuration explicitly permit that operation. The default behavior is to push the build to Git and verify that the configured deployment automation was triggered.

## CI Review Standards

Claude Code must apply the following coding standards to every change it produces. These standards form the baseline for Greptile or Greploop review context.

| Standard | Requirement |
|---|---|
| Secure defaults | All new code must use safe defaults. Disabled-by-default, fail-closed behavior is required for security controls. |
| Parameterized queries | Any code that interacts with a database must use parameterized queries or an ORM with bound parameters. Raw string interpolation into SQL is forbidden. |
| Least-privilege configuration | Configuration, scripts, and infrastructure definitions must not request or grant more permissions than the task requires. |
| No hardcoded secrets | API keys, tokens, passwords, and credentials must not appear in committed files. Use environment variables or git-ignored local config files. |
| Explicit tests for changed behavior | Any behavioral change must be accompanied by an explicit test or, where automated tests are not possible, a documented manual verification step in the archived task result. |
| No unrelated application changes | Claude Code must not modify source files outside the task pod's `files`, `allowed_paths`, or the bridge's own lifecycle paths. Do not refactor, rename, or reformat code that is not required by the task. |

Enable the Greptile plugin in Claude Code with `/plugins` and run `/greploop` or `/check-pr` manually when the Greptile CLI is unavailable.

## Quality Rules

Claude Code should prefer deterministic, local checks before committing. If the repository contains tests, linting, formatting, or type-checking commands, run the relevant checks. If no test command exists, state that explicitly in the archived pod result. Do not invent passing test results.

If Greptile or another review gate is configured, Claude Code must mark whether review passed, failed, or was unavailable. A missing optional review tool must be reported accurately rather than treated as success.

## Safety Rules

Do not expose secrets, tokens, cookies, credentials, or private machine paths in commits. Do not make network calls, install dependencies, or run destructive commands unless the task pod explicitly requires it or the user has approved it. Do not modify `.git/` directly; use bridge scripts and normal Git commands. Do not commit `.claude/pod-bridge.local.json`, `.claude/logs/`, environment files containing secrets, or machine-local deployment credentials.

## Output Expectations

At completion, the repository should show a clear implementation diff, an archived task pod with result metadata, and a commit on the appropriate implementation branch. If Git handoff is enabled, the result must record the remote, branch, commit SHA, push status, and deployment-trigger verification status. If the task cannot be completed, the archived or failed pod must explain the blocker and preserve enough detail for Manus or the user to create a follow-up task.
