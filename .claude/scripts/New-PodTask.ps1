[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][string]$TaskId,
    [Parameter(Mandatory=$true)][string]$Title,
    [Parameter(Mandatory=$true)][string[]]$AcceptanceCriteria,
    [string]$ImplementationNotes = '',
    [string[]]$SpecFiles = @('ARCHITECTURE_SPECS.md', 'CLAUDE.md'),
    [string[]]$AllowedPaths = @(),
    [string[]]$ForbiddenPaths = @('.git/', '.claude/pod-bridge.local.json'),
    [string]$Priority = 'normal',
    [string]$Branch = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$inbox = Join-Path $repoRoot 'pods\inbox'
if (!(Test-Path $inbox)) {
    New-Item -ItemType Directory -Force -Path $inbox | Out-Null
}

if ([string]::IsNullOrWhiteSpace($Branch)) {
    $Branch = "claude/$TaskId"
}

$task = [ordered]@{
    schema_version = '1.0'
    task_id = $TaskId
    title = $Title
    status = 'queued'
    created_by = 'manus'
    created_at = (Get-Date).ToUniversalTime().ToString('o')
    priority = $Priority
    branch = $Branch
    spec_files = $SpecFiles
    allowed_paths = $AllowedPaths
    forbidden_paths = $ForbiddenPaths
    acceptance_criteria = $AcceptanceCriteria
    implementation_notes = $ImplementationNotes
    result = $null
}

$outPath = Join-Path $inbox ("$TaskId.json")
if (Test-Path $outPath) {
    throw "Task pod already exists: $outPath"
}

$task | ConvertTo-Json -Depth 32 | Set-Content -Path $outPath -Encoding UTF8
Write-Output "Created queued task pod: $outPath"
Write-Output "Review it, then commit it with: git add pods/inbox/$TaskId.json && git commit -m 'manus: add pod task $TaskId'"
