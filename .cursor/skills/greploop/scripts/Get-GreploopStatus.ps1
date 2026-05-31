#Requires -Version 5.1
<#
.SYNOPSIS
  Snapshot Greptile PR review state for greploop.
.PARAMETER PrNumber
  PR number. Auto-detects from current branch if omitted.
#>
param(
    [int]$PrNumber = 0
)

$ErrorActionPreference = 'Stop'

function Get-Gh {
    $paths = @(
        'C:\Program Files\GitHub CLI\gh.exe',
        "${env:ProgramFiles}\GitHub CLI\gh.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) { return $p }
    }
    $cmd = Get-Command gh -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    throw 'GitHub CLI (gh) not found. Run: winget install GitHub.cli'
}

$gh = Get-Gh

if ($PrNumber -eq 0) {
    $view = & $gh pr view --json number,title,headRefName,headRefOid,url,body | ConvertFrom-Json
} else {
    $view = & $gh pr view $PrNumber --json number,title,headRefName,headRefOid,url,body | ConvertFrom-Json
}

$prNum = $view.number
$sha = $view.headRefOid

# Greptile check
$checks = & $gh pr checks $prNum --json name,state,link 2>$null | ConvertFrom-Json
$greptileCheck = $checks | Where-Object { $_.name -match 'greptile' } | Select-Object -First 1

# Inline review comments
$inline = & $gh api "repos/{owner}/{repo}/pulls/$prNum/comments" | ConvertFrom-Json
$unresolvedInline = @($inline | Where-Object { $_.in_reply_to_id -eq $null })

# Latest Greptile issue comment
$issueComments = & $gh api --paginate "repos/{owner}/{repo}/issues/$prNum/comments?per_page=100" | ConvertFrom-Json
$greptileComment = $issueComments |
    Where-Object { $_.user.login -match 'greptile' } |
    Sort-Object { [datetime]$_.updated_at } -Descending |
    Select-Object -First 1

$confidence = $null
$textToScan = @($view.body, $greptileComment.body) -join "`n"
if ($textToScan -match '(?i)confidence[:\s]*(\d)\s*/\s*5') {
    $confidence = "$($Matches[1])/5"
} elseif ($textToScan -match '(\d)\s*/\s*5') {
    $confidence = "$($Matches[1])/5"
}

$result = [ordered]@{
    pr           = $prNum
    title        = $view.title
    branch       = $view.headRefName
    url          = $view.url
    sha          = $sha
    confidence   = $confidence
    greptileCheck = if ($greptileCheck) { $greptileCheck.state } else { 'not_found' }
    inlineComments = $unresolvedInline.Count
    latestGreptileComment = if ($greptileComment) { $greptileComment.updated_at } else { $null }
}

$result | ConvertTo-Json -Depth 4
Write-Host ""
Write-Host "PR #$($result.pr): $($result.title)" -ForegroundColor Cyan
$confDisplay = if ($result.confidence) { $result.confidence } else { 'unknown' }
Write-Host "  Confidence:    $confDisplay"
Write-Host "  Greptile check: $($result.greptileCheck)"
Write-Host "  Inline comments: $($result.inlineComments)"
