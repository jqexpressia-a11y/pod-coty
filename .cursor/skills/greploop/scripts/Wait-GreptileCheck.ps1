#Requires -Version 5.1
<#
.SYNOPSIS
  Poll until the Greptile GitHub check completes for a PR HEAD commit.
.PARAMETER PrNumber
  PR number. Auto-detects from current branch if omitted.
.PARAMETER TimeoutSeconds
  Max wait time (default 600).
#>
param(
    [int]$PrNumber = 0,
    [int]$TimeoutSeconds = 600
)

$ErrorActionPreference = 'Stop'

function Get-Gh {
    $paths = @('C:\Program Files\GitHub CLI\gh.exe', "${env:ProgramFiles}\GitHub CLI\gh.exe")
    foreach ($p in $paths) {
        if (Test-Path $p) { return $p }
    }
    $cmd = Get-Command gh -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    throw 'GitHub CLI (gh) not found. Run: winget install GitHub.cli'
}

$gh = Get-Gh
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)

if ($PrNumber -eq 0) {
    $sha = & $gh pr view --json headRefOid -q .headRefOid
    $PrNumber = [int](& $gh pr view --json number -q .number)
} else {
    $sha = & $gh pr view $PrNumber --json headRefOid -q .headRefOid
}

Write-Host "Waiting for Greptile check on PR #$PrNumber (sha: $sha)..."

while ((Get-Date) -lt $deadline) {
    $raw = & $gh api "repos/{owner}/{repo}/commits/$sha/check-runs" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Start-Sleep -Seconds 10
        continue
    }

    $data = $raw | ConvertFrom-Json
    $greptile = $data.check_runs | Where-Object { $_.name -match 'greptile' } | Select-Object -First 1

    if (-not $greptile) {
        Write-Host '  Greptile check not visible yet...'
        Start-Sleep -Seconds 10
        continue
    }

    if ($greptile.status -eq 'completed') {
        Write-Host "  Done: $($greptile.conclusion)" -ForegroundColor Green
        [ordered]@{
            pr = $PrNumber
            sha = $sha
            status = $greptile.status
            conclusion = $greptile.conclusion
        } | ConvertTo-Json
        exit 0
    }

    Write-Host "  Status: $($greptile.status)..."
    Start-Sleep -Seconds 10
}

Write-Error "Timed out after ${TimeoutSeconds}s waiting for Greptile check."
exit 1
