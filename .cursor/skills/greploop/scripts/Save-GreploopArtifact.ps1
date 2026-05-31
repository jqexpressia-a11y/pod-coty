#Requires -Version 5.1
<#
.SYNOPSIS
  Persist one greploop iteration as a durable artifact bundle.
.PARAMETER PrNumber
  Pull request number.
.PARAMETER Iteration
  Loop iteration number (1-based).
.PARAMETER Confidence
  Greptile confidence score string, e.g. 4/5.
.PARAMETER InlineComments
  Count of unresolved inline comments.
.PARAMETER Notes
  Freeform notes for this iteration.
.PARAMETER StatusJsonPath
  Optional path to JSON file with full iteration payload.
#>
param(
    [int]$PrNumber = 0,
    [int]$Iteration = 1,
    [string]$Confidence = "",
    [int]$InlineComments = 0,
    [string]$Notes = "",
    [string]$StatusJsonPath = ""
)

$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
    $here = Split-Path -Parent $PSScriptRoot
    while ($here -and -not (Test-Path (Join-Path $here '.git'))) {
        $parent = Split-Path -Parent $here
        if ($parent -eq $here) { break }
        $here = $parent
    }
    if (Test-Path (Join-Path $here '.git')) { return (Resolve-Path $here).Path }
    return (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
}

$repo = Get-RepoRoot
$timestamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$runRoot = Join-Path $repo ".claude\artifacts\greploop\pr-$PrNumber\$timestamp"
New-Item -ItemType Directory -Force -Path $runRoot | Out-Null

$payload = [ordered]@{
    schema_version = '1.0'
    pr             = $PrNumber
    iteration      = $Iteration
    confidence     = $Confidence
    inline_comments = $InlineComments
    notes          = $Notes
    recorded_at    = (Get-Date).ToUniversalTime().ToString('o')
}

if ($StatusJsonPath -and (Test-Path $StatusJsonPath)) {
    $extra = Get-Content -Raw -Path $StatusJsonPath | ConvertFrom-Json
    $payload['status'] = $extra
}

$iterationFile = Join-Path $runRoot ("iteration-$Iteration.json")
$payload | ConvertTo-Json -Depth 8 | Set-Content -Path $iterationFile -Encoding UTF8

$summaryPath = Join-Path $runRoot 'summary.md'
@"
# Greploop iteration $Iteration

- PR: #$PrNumber
- Confidence: $Confidence
- Unresolved inline comments: $InlineComments
- Recorded: $($payload.recorded_at)

## Notes

$Notes
"@ | Set-Content -Path $summaryPath -Encoding UTF8

$manifest = [ordered]@{
    schema_version = '1.0'
    namespace      = "greploop/pr-$PrNumber"
    run_id         = $timestamp
    created_at     = $payload.recorded_at
    artifacts      = @(
        @{ name = "iteration-$Iteration.json"; kind = 'json'; path = (Resolve-Path $iterationFile).Path },
        @{ name = 'summary.md'; kind = 'markdown'; path = (Resolve-Path $summaryPath).Path }
    )
}
$manifestPath = Join-Path $runRoot 'manifest.json'
$manifest | ConvertTo-Json -Depth 6 | Set-Content -Path $manifestPath -Encoding UTF8

[ordered]@{
    run_id   = $timestamp
    root     = ".claude/artifacts/greploop/pr-$PrNumber/$timestamp"
    manifest = ".claude/artifacts/greploop/pr-$PrNumber/$timestamp/manifest.json"
} | ConvertTo-Json
