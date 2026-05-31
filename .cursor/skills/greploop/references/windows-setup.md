# Windows setup for Greploop

## Install GitHub CLI

```powershell
winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements
```

Restart the terminal, then:

```powershell
gh auth login
gh auth status
```

If `gh` is not on PATH:

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" auth login
```

## Install Greptile on a repo

1. Sign in at [greptile.com](https://www.greptile.com).
2. Connect GitHub and enable the repo (e.g. `jqexpressia-a11y/pod-coty`).
3. Open a PR; Greptile should post a review and add a check run.

## Verify tools

```powershell
& "C:\Program Files\Git\bin\git.exe" --version
& "C:\Program Files\GitHub CLI\gh.exe" --version
& "C:\Program Files\GitHub CLI\gh.exe" pr list
```

## Run greploop in Cursor

1. Open the project folder in Cursor.
2. Ask: **"Run greploop on this PR"** or **"/greploop"** (if your setup supports skill invocation by name).
3. The agent loads this skill and executes the loop.

Skill location: `%USERPROFILE%\.cursor\skills\greploop\`
