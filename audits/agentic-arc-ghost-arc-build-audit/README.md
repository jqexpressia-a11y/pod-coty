# Agentic-Arc / Ghost Arc Build Audit Handoff

This directory contains the validated build-audit package for `JavaScript-Mastery-Pro/Agentic-Arc`, the JavaScript Mastery repository matching the requested Ghost Arc target.

The upstream repository is readable but not writable by `jqexpressia-a11y`, so this handoff stores the **audit results** and the **package-lock patch** in jq's GitHub repository instead of attempting to push directly to the JavaScript Mastery organization.

| File | Purpose |
|---|---|
| `BUILD_AUDIT.md` | Human-readable summary of the build, lint, dependency, and runtime smoke results. |
| `artifact_check_results.md` | Markdown output from the artifact checker. |
| `artifact_check_results.json` | Structured output from the artifact checker. |
| `artifact_checker.py` | Reusable checker script for rerunning the validation after fresh logs are captured. |
| `package-lock-reproducible-install-fix.patch` | Patch that repairs the stale upstream `package-lock.json` so `npm ci` succeeds. |
| `npm_build.log` | Production build log. |
| `npm_lint.log` | ESLint log. |
| `npm_ci_after_lockfix.log` | Reproducible install log after the package-lock fix. |
| `smoke_http.log` | HTTP smoke-test result showing runtime blocked by placeholder Clerk credentials. |
| `github_candidate_search.tsv` | Repository search evidence used to identify the target. |

To apply the lock-file fix in a local clone of Agentic-Arc, run:

```bash
cd Agentic-Arc
git apply /path/to/package-lock-reproducible-install-fix.patch
npm ci --no-audit --no-fund
npm run build
npm run lint
```
