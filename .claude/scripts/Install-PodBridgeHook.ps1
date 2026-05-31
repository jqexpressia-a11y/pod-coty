[CmdletBinding()]
param(
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $repoRoot

$gitCommand = Get-Command git -ErrorAction SilentlyContinue
$gitPath = $null
if ($gitCommand) {
    $gitPath = $gitCommand.Source
}
elseif (Test-Path 'C:\Program Files\Git\cmd\git.exe') {
    $gitPath = 'C:\Program Files\Git\cmd\git.exe'
}
if (-not $gitPath) {
    throw 'Git was not found on PATH and was not found at C:\Program Files\Git\cmd\git.exe.'
}

$gitDir = & $gitPath rev-parse --git-dir
if ($LASTEXITCODE -ne 0 -or -not $gitDir) {
    throw 'This script must be run inside a Git repository.'
}

if (-not [System.IO.Path]::IsPathRooted($gitDir)) {
    $gitDir = Join-Path $repoRoot $gitDir
}

$hooksDir = Join-Path $gitDir 'hooks'
$template = Join-Path $repoRoot '.claude\hooks\post-commit'
$target = Join-Path $hooksDir 'post-commit'
$backup = Join-Path $hooksDir ("post-commit.backup.{0}" -f (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ'))

if (!(Test-Path $hooksDir)) {
    New-Item -ItemType Directory -Force -Path $hooksDir | Out-Null
}

if (!(Test-Path $template)) {
    throw "Hook template not found: $template"
}

if ((Test-Path $target) -and -not $Force) {
    Copy-Item -Path $target -Destination $backup -Force
    Write-Output "Existing post-commit hook backed up to $backup"
}

Copy-Item -Path $template -Destination $target -Force

try {
    & $gitPath update-index --chmod=+x .claude/hooks/post-commit 2>$null | Out-Null
}
catch {
    # File mode updates are best-effort on Windows.
}

Write-Output "Installed pod bridge post-commit hook at $target"
Write-Output "Hook dispatch is disabled by default. Copy .claude/pod-bridge.example.json to .claude/pod-bridge.local.json and set enabled=true when ready."
