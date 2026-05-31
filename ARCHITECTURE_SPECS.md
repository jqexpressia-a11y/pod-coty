# Repo-Mediated Manus ↔ Claude Code Bridge Architecture

**Author:** Manus AI  
**Repository:** `podcity`  
**Status:** Shared-spec and Git-triggered deployment workflow  

## Purpose

This repository uses Git history and a structured `pods/` directory as the **communication channel** between Manus and Claude Code. Manus acts as the architecture agent and writes durable intent into `ARCHITECTURE_SPECS.md` plus executable task pods into `pods/inbox/`. Claude Code acts as the implementation agent and reads the same shared specification before processing a task pod.

This design makes every handoff inspectable, replayable, and recoverable because the durable interface is repository state. The implementation bridge should run Claude Code through bounded headless execution with `claude -p`, which is the non-interactive command shape suitable for automation.[1] Git is the post-build handoff mechanism: after local quality gates pass, the bridge can commit and push approved changes so downstream deployment automation can react to the new commit. Git documents hooks as programs that run at defined points in Git execution, including `post-commit`, which may be used as a local notification trigger.[2]

> The intended exchange model is not a private agent conversation. Manus writes the shared spec and task pod; Claude Code reads repository files, implements the task, commits the result, and the configured Git-based deployment system handles the KVM release.

## Repository Layout

The bridge follows a project-root layout. The `pods/` folder is the task queue, while `.claude/` holds local bridge scripts, configuration, schemas, and logs.

| Path | Owner | Purpose |
|---|---|---|
| `CLAUDE.md` | Repository maintainers | Defines implementation-agent rules, safety limits, headless execution expectations, and Git handoff behavior. |
| `ARCHITECTURE_SPECS.md` | Manus and maintainers | Shared source of truth for both agents. |
| `pods/inbox/` | Manus | Receives queued JSON task pods. |
| `pods/active/` | Bridge or Claude Code | Stores a claimed task currently being processed. |
| `pods/archive/` | Bridge or Claude Code | Stores completed, skipped, or failed task pods with result metadata. |
| `pods/failed/` | Bridge or Claude Code | Optional separate failure folder for failed task artifacts. |
| `.claude/pod-bridge.example.json` | Repository maintainers | Versioned example configuration for local bridge behavior. |
| `.claude/pod-bridge.local.json` | Local operator | Git-ignored local settings for enablement, command permissions, Git push, and deployment verification. |
| `.claude/logs/` | Local bridge | Git-ignored execution logs. |
| `.claude/artifacts/<task_id>/<run_id>/` | Local bridge | Git-ignored artifact bundles: execution JSON, Greptile output, git handoff, deployment verification, manifests. |
| `.claude/artifacts/greploop/pr-<n>/<run_id>/` | Greploop / bridge | Per-iteration PR review artifacts (`iteration-N.json`, `summary.md`, `manifest.json`). |

## Agent Responsibilities

Manus and Claude Code must coordinate through the shared repository files. The architecture file describes why and how the system should behave; task pods describe one executable unit of work.

| Actor | Responsibility | Must Not Do |
|---|---|---|
| Manus | Write architecture intent, acceptance criteria, and task pods. | Implement production code directly when the workflow assigns implementation to Claude Code. |
| Claude Code | Read `CLAUDE.md`, `ARCHITECTURE_SPECS.md`, and the active pod; implement, test, commit, and report structured results. | Rely on private chat context or ignore `allowed_paths` and `forbidden_paths`. |
| Bridge | Claim one queued pod, dispatch Claude Code headlessly, parse JSON output, move lifecycle files, and optionally perform Git handoff. | Run unbounded loops, commit secrets, or claim deployment success without verification. |
| KVM deployment automation | React to the pushed Git commit through configured CI, webhook, or deployment service. | Depend on Manus or Claude Code running direct provisioning commands by default. |

## Task Pod Lifecycle

A task pod is a JSON file written into `pods/inbox/`. Manus creates or updates the task pod, and a local bridge can claim it for implementation. The bridge should process one task at a time unless explicitly configured otherwise.

| State | Folder | Meaning | Transition |
|---|---|---|---|
| `queued` | `pods/inbox/` | Manus has produced a task. | A bridge or manual command claims it. |
| `active` | `pods/active/` | The bridge is processing the task. | Claude Code completes, fails, or skips it. |
| `completed` | `pods/archive/` | Claude Code created an implementation result and, when enabled, a Git commit. | Git push and deployment-trigger verification may follow. |
| `failed` | `pods/archive/` or `pods/failed/` | The task could not run or failed quality gates. | Manus or a human can create a follow-up task. |
| `skipped` | `pods/archive/` | Dispatch is disabled or no matching task should run. | No implementation action is taken. |

## Required Shared-Spec Behavior

The field `spec_file` should point to `ARCHITECTURE_SPECS.md` when a task has one canonical shared specification. The legacy `spec_files` array remains acceptable for multiple supporting files. Claude Code must read the shared specification before modifying repository files.

| Requirement | Expected Behavior |
|---|---|
| Single source of architectural truth | `ARCHITECTURE_SPECS.md` is read by both agents. |
| Executable task queue | `pods/inbox/*.json` contains implementation-ready tasks. |
| Spec mismatch | If the task and shared spec conflict, Claude Code should fail safely or ask for clarification through task metadata rather than guessing. |
| Missing shared spec | Claude Code should mark the task failed and avoid code edits. |

## Headless Dispatch Model

The bridge should invoke Claude Code in non-interactive mode and require structured output. Interactive watch sessions may be useful for manual development, but they are not the default automation mechanism for this repository.

```powershell
claude -p "Read CLAUDE.md, ARCHITECTURE_SPECS.md, and the active task pod at <task_path>. Implement the task on branch <branch>. Respect allowed_paths and forbidden_paths. Run relevant checks, update and archive the task pod, commit approved changes, and return structured JSON." --allowedTools "Bash,Read,Edit" --max-turns 10 --output-format json
```

The bridge must parse the JSON result and record at least the build status, changed files, checks, review status, Git handoff status, deployment-trigger verification status, infrastructure requirements, and notes. Permission bypass flags such as `--dangerously-skip-permissions` must remain disabled by default and may be enabled only through explicit git-ignored local configuration.

## Artifact Bundles

Every bridge or greploop run must leave a durable, inspectable artifact bundle under `.claude/artifacts/`. Artifact directories are git-ignored. Archived task pods must reference the bundle through `result.artifacts`.

| Artifact file | Producer | Purpose |
|---|---|---|
| `manifest.json` | Bridge or greploop | Index of files in the run with sizes and relative paths. |
| `task.snapshot.json` | Bridge | Copy of the task pod at claim time. |
| `execution.result.json` | Bridge | Parsed Claude headless output. |
| `claude.stdout.txt` / `claude.stderr.txt` | Bridge | Raw execution streams. |
| `greptile.json` | Bridge | Greptile CLI or greploop review snapshot. |
| `git-handoff.json` | Bridge | Stage/commit/push commands and outcomes. |
| `deployment-trigger.json` | Bridge | KVM trigger verification status. |
| `iteration-N.json` | Greploop | One review loop iteration snapshot. |
| `summary.md` | Greploop | Human-readable iteration summary. |
| `greploop-final.json` | Greploop | Final loop outcome after all iterations. |

## Branching, Commit, and Push Model

The default implementation branch naming convention is `claude/<task_id>`. If a task specifies a `branch`, the bridge may use that branch after verifying that doing so is allowed by local configuration.

| Stage | Required Control |
|---|---|
| Pre-commit | Verify the diff is limited to allowed paths and excludes secrets, local logs, and unrelated user changes. |
| Commit | Use a task-linked commit message such as `claude: implement <task_id> <short title>`. |
| Push | Push only when local configuration enables Git handoff and the target remote and branch are verified. |
| Result metadata | Record remote, branch, commit SHA, push status, and any error. |

## KVM Deployment Trigger Verification

The KVM environment should be reached through downstream Git automation after the implementation commit is pushed. The bridge should not directly run `terraform apply`, Ansible playbooks, SSH deployment commands, or other KVM provisioning operations unless the task pod and local operator configuration explicitly allow that operation.

After a real push, the bridge must verify that the KVM deployment trigger fired through at least one configured mechanism. Acceptable verification sources include GitHub Actions status, deployment status, repository webhook delivery, a deployment API, or a local verification command configured by the operator. If no verification mechanism is available, the bridge must report `deployment_trigger_verified: false` and must not claim that the KVM deployment succeeded.

| Verification Outcome | Required Result |
|---|---|
| Trigger verified | Record mechanism, target branch, commit SHA, and status URL or command output summary. |
| Trigger not discoverable | Record `deployment_trigger_verified: false` and explain what configuration is missing. |
| Trigger failed | Mark the handoff as failed or needs attention; do not archive as a clean deployment success. |
| Infrastructure command requested directly | Require explicit local opt-in and task-level authorization before execution. |

## Dispatch Safety

The bridge is intentionally conservative. Dispatch should be disabled by default in versioned configuration and enabled only through `.claude/pod-bridge.local.json`, which is ignored by Git. Dry-run mode should print the task selected, prompt, Git commands, and deployment verification commands without executing them.

| Safety Control | Default | Reason |
|---|---:|---|
| `enabled` | `false` | Prevents accidental autonomous implementation loops. |
| `dry_run_default` | `true` | Allows safe validation of task discovery and prompt construction. |
| `max_turns` | `10` | Prevents unbounded headless execution. |
| `allowed_tools` | `Bash,Read,Edit` | Limits automated tool use. |
| `dangerously_skip_permissions` | `false` | Avoids silent permission bypass. |
| `git_handoff.enabled` | `false` | Prevents accidental push until the operator opts in. |
| `deployment_verification.required` | `true` when Git handoff is enabled | Prevents false KVM deployment success claims. |

## Manual Operation

Before enabling automation, the operator should verify that Claude Code is installed and visible on `PATH`, that Python or PowerShell bridge dependencies exist, and that any required API keys are available in the local execution environment without being committed.

A safe read-only dry run is:

```powershell
Set-Location C:\Users\johnw\OneDrive\Desktop\podcity
claude -p "Read CLAUDE.md, ARCHITECTURE_SPECS.md, and the queued task pod in ./pods/inbox. Summarize the implementation plan without modifying files. Return JSON." --allowedTools "Read" --max-turns 3 --output-format json
```

After the bridge is implemented and local configuration is enabled, the operator can run the bridge in dry-run mode first, then enable real dispatch and Git handoff only after the selected remote, branch, and KVM deployment verification command are configured.

## References

[1]: https://docs.anthropic.com/en/docs/claude-code/cli-reference "Claude Code CLI Reference"  
[2]: https://git-scm.com/docs/githooks "Git - githooks Documentation"
