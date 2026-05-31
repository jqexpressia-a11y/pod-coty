---
name: greploop
description: >
  Iteratively improves a GitHub PR until Greptile gives 5/5 confidence with zero unresolved
  comments. Triggers Greptile review, fixes actionable feedback, pushes, and repeats (max 5
  iterations). Use when the user says greploop, wants a perfect Greptile score, or wants PR
  review feedback auto-fixed in a loop.
---

# Greploop

Automated PR improvement loop: **review → fix → push → re-review** until Greptile reports **5/5** with **zero unresolved** inline comments.

## Prerequisites

| Tool | Windows path | Install |
|------|--------------|---------|
| Git | `C:\Program Files\Git\bin\git.exe` | [git-scm.com](https://git-scm.com) |
| GitHub CLI | `C:\Program Files\GitHub CLI\gh.exe` | `winget install GitHub.cli` |
| Greptile | — | Install on the repo at [greptile.com](https://www.greptile.com) |

Before looping, confirm `gh auth status` succeeds. If `gh` is not on PATH, call the full path above.

## Quick start

1. Check out the PR branch and ensure changes are committed locally.
2. Run `scripts/Get-GreploopStatus.ps1` (optional) to snapshot PR + Greptile state.
3. Follow the **Loop** below until exit conditions are met.
4. Run `scripts/Get-GreploopStatus.ps1` again and report the summary table.

Invoke explicitly: user says **"run greploop"** or **"greploop PR 42"**.

## Inputs

- **PR number** (optional): Auto-detect from current branch if omitted.
- **Max iterations**: Default **5**.

## Windows command aliases

```powershell
$git = "C:\Program Files\Git\bin\git.exe"
$gh  = if (Test-Path "C:\Program Files\GitHub CLI\gh.exe") { "C:\Program Files\GitHub CLI\gh.exe" } else { "gh" }
```

Use these variables in all Bash/PowerShell snippets below.

## Loop

Repeat until exit or max iterations.

### A. Push and trigger Greptile

```powershell
& $git push
Start-Sleep -Seconds 5

$pr = & $gh pr view --json number,headRefOid -q '{number: .number, sha: .headRefOid}'
# Parse $pr for PR_NUMBER and HEAD_SHA

$greptileState = & $gh pr checks $PR_NUMBER --json name,state | ConvertFrom-Json |
  Where-Object { $_.name -match 'greptile' } | Select-Object -ExpandProperty state

if ($greptileState -notin @('PENDING','IN_PROGRESS')) {
  & $gh pr comment $PR_NUMBER --body "@greptile review"
}
```

Poll until the Greptile check completes (use `scripts/Wait-GreptileCheck.ps1` or poll manually every 10s):

```powershell
& $gh api "repos/{owner}/{repo}/commits/$HEAD_SHA/check-runs" --jq '.check_runs[] | select(.name | test("greptile"; "i")) | {status, conclusion}'
```

Stop polling when `status` is `completed`.

### B. Fetch review results

Check **all** sources; use the **most recently updated** Greptile summary:

1. PR body: `& $gh pr view $PR_NUMBER --json body -q .body`
2. Issue comments (prefer latest `updated_at` from greptile bot):
   `& $gh api --paginate "repos/{owner}/{repo}/issues/$PR_NUMBER/comments?per_page=100"`
3. PR reviews: `& $gh api "repos/{owner}/{repo}/pulls/$PR_NUMBER/reviews"`

Parse for:
- **Confidence**: pattern `(\d)/5` or `Confidence:\s*(\d)/5`
- **Unresolved inline comments**: `& $gh api "repos/{owner}/{repo}/pulls/$PR_NUMBER/comments"`

Also read the **"Prompt to fix all with AI"** section from the latest Greptile general comment even when inline count is zero.

Optional snapshot: `scripts/Get-GreploopStatus.ps1 -PrNumber $PR_NUMBER`

### B2. Save iteration artifacts (required)

After each review fetch, persist a durable artifact bundle under `.claude/artifacts/greploop/pr-<PR>/`:

```powershell
.\.cursor\skills\greploop\scripts\Save-GreploopArtifact.ps1 `
  -PrNumber $PR_NUMBER `
  -Iteration $N `
  -Confidence "4/5" `
  -InlineComments 2 `
  -Notes "Awaiting fixes on auth.ts"
```

Artifact layout:

| File | Purpose |
|------|---------|
| `manifest.json` | Index of all files in the run |
| `iteration-N.json` | Structured iteration snapshot |
| `summary.md` | Human-readable iteration summary |

On loop completion, write a final `greploop-final.json` in the latest run folder with total iterations, final confidence, and remaining comment count.

### C. Exit conditions

Stop when **either**:
- Confidence is **5/5** AND unresolved inline comments = **0**, or
- Max iterations reached (report partial state).

### D. Fix actionable comments

For each unresolved Greptile comment:

1. Read the file at the commented line with surrounding context.
2. Decide: actionable code fix vs informational / false positive.
3. Apply the fix for actionable items; document why for false positives.

### E. Resolve addressed threads

Fetch unresolved threads via GraphQL (see [references/github-graphql.md](references/github-graphql.md)), then batch-resolve:

```powershell
& $gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "THREAD_ID"}) { thread { isResolved } } }'
```

Resolve every thread you addressed in step D.

### F. Commit, push, next iteration

```powershell
& $git add -A
& $git commit -m "fix: address greptile review feedback (greploop iteration N)"
& $git push
Start-Sleep -Seconds 5
```

Return to **A**.

## Report format

```
Greploop complete.
  Platform:      GitHub
  PR:            #42
  Iterations:    2
  Confidence:    5/5
  Resolved:      7 comments
  Remaining:     0
```

If stopped early:

```
Greploop stopped after 5 iterations.
  Confidence:    4/5
  Remaining:     2

Remaining issues:
  - src/auth.ts:45 — "Consider rate limiting this endpoint"
  - src/db.ts:112 — "Missing index on user_id column"
```

## Constraints

- Do **not** exceed 5 loop iterations.
- Do **not** force-push unless the user explicitly requests it.
- Do **not** resolve threads without reading them; only resolve after fix or documented false positive.
- Do **not** skip `git push` between iterations.
- Only commit when there are real changes; never create empty commits.

## Additional resources

- GraphQL queries: [references/github-graphql.md](references/github-graphql.md)
- Windows setup: [references/windows-setup.md](references/windows-setup.md)
- Status script: [scripts/Get-GreploopStatus.ps1](scripts/Get-GreploopStatus.ps1)
- Poll script: [scripts/Wait-GreptileCheck.ps1](scripts/Wait-GreptileCheck.ps1)
- Artifact script: [scripts/Save-GreploopArtifact.ps1](scripts/Save-GreploopArtifact.ps1)
