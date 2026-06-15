<#
.SYNOPSIS
    Creates a Chrome app shortcut for Pod City Mission Control on your Desktop.
    Run this once; then double-click the shortcut to launch the dashboard.

.DESCRIPTION
    Mirrors the behaviour of the manus.space .lnk but points to localhost:3001
    so the dashboard works without an internet deployment.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\Create-PodCity-Shortcut.ps1
#>

param(
    [string]$Port      = "3001",
    [string]$ShortcutName = "Pod City Mission Control"
)

$ErrorActionPreference = "Stop"

# Locate Chrome
$chromePaths = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:LocalAppData}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
)
$chrome = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) {
    Write-Error "Google Chrome not found. Install Chrome first."
    exit 1
}

$url      = "http://localhost:$Port"
$desktop  = [Environment]::GetFolderPath("Desktop")
$lnkPath  = Join-Path $desktop "$ShortcutName.lnk"

# Resolve the start.bat launcher (two directories up from this script)
$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$startBat   = Join-Path $scriptDir "start.bat"
$repoRoot   = Split-Path -Parent (Split-Path -Parent $scriptDir)

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($lnkPath)
$shortcut.TargetPath       = $chrome
$shortcut.Arguments        = "--app=$url --window-size=1440,900"
$shortcut.WorkingDirectory = Split-Path -Parent $scriptDir   # dashboard dir
$shortcut.Description      = "Pod City Agentic OS Dashboard (localhost)"
$shortcut.WindowStyle      = 1   # normal window

# Use Chrome icon
$shortcut.IconLocation = "$chrome,0"

$shortcut.Save()

Write-Host ""
Write-Host "  ✅  Shortcut created:" -ForegroundColor Green
Write-Host "      $lnkPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Before double-clicking the shortcut, start the server:" -ForegroundColor Yellow
Write-Host "      $startBat" -ForegroundColor White
Write-Host ""
Write-Host "  Or run from the dashboard directory:" -ForegroundColor Yellow
Write-Host "      npm run dev -- -p $Port" -ForegroundColor White
Write-Host ""
