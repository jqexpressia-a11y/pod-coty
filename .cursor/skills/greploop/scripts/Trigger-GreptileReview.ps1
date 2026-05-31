#Requires -Version 5.1
<#
.SYNOPSIS
  Push branch and trigger a new Greptile review on the current PR.
.PARAMETER PrNumber
  PR number. Auto-detects from current branch if omitted.
#>
param([int]$PrNumber = 0)

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

$git = 'C:\Program Files\Git\bin\git.exe'
if (-not (Test-Path $git)) { $git = 'git' }

$gh = Get-Gh

& $git push
Start-Sleep -Seconds 5

if ($PrNumber -eq 0) {
    $PrNumber = [int](& $gh pr view --json number -q .number)
}

$checks = & $gh pr checks $PrNumber --json name,state 2>$null | ConvertFrom-Json
$state = ($checks | Where-Object { $_.name -match 'greptile' } | Select-Object -First 1).state

if ($state -notin @('PENDING', 'IN_PROGRESS')) {
    & $gh pr comment $PrNumber --body '@greptile review'
    Write-Host "Triggered Greptile review on PR #$PrNumber"
} else {
    Write-Host "Greptile already running on PR #$PrNumber ($state)"
}
