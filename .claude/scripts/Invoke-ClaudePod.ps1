[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$RunOnce,
    [switch]$FromHook
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Join-RepoPath {
    param([Parameter(Mandatory=$true)][string]$Path)
    return Join-Path $script:RepoRoot $Path
}

function Write-BridgeLog {
    param([Parameter(Mandatory=$true)][string]$Message)
    $timestamp = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    $line = "[$timestamp] $Message"
    Write-Output $line
    $logPath = Join-RepoPath $script:Config.log_file
    $logDir = Split-Path -Parent $logPath
    if (!(Test-Path $logDir)) {
        New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    }
    Add-Content -Path $logPath -Value $line -Encoding UTF8
}

function Read-JsonFile {
    param([Parameter(Mandatory=$true)][string]$Path)
    return Get-Content -Raw -Path $Path -Encoding UTF8 | ConvertFrom-Json
}

function Write-JsonFile {
    param(
        [Parameter(Mandatory=$true)]$Object,
        [Parameter(Mandatory=$true)][string]$Path
    )
    $json = $Object | ConvertTo-Json -Depth 32
    Set-Content -Path $Path -Value $json -Encoding UTF8
}

function Merge-Config {
    param($Base, $Overlay)
    foreach ($property in $Overlay.PSObject.Properties) {
        $Base | Add-Member -MemberType NoteProperty -Name $property.Name -Value $property.Value -Force
    }
    return $Base
}

function Assert-TaskShape {
    param($Task, [string]$Path)
    foreach ($field in @('schema_version', 'task_id', 'title', 'status', 'created_by', 'created_at', 'acceptance_criteria')) {
        if (-not ($Task.PSObject.Properties.Name -contains $field)) {
            throw "Task pod '$Path' is missing required field '$field'."
        }
    }
    if ($Task.status -ne 'queued') {
        throw "Task pod '$Path' has status '$($Task.status)', expected 'queued'."
    }
}

$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $script:RepoRoot

$exampleConfigPath = Join-RepoPath '.claude\pod-bridge.example.json'
$localConfigPath = Join-RepoPath '.claude\pod-bridge.local.json'
$script:Config = Read-JsonFile $exampleConfigPath
if (Test-Path $localConfigPath) {
    $script:Config = Merge-Config $script:Config (Read-JsonFile $localConfigPath)
}

$envEnabled = ($env:POD_BRIDGE_ENABLED -eq '1' -or $env:POD_BRIDGE_ENABLED -eq 'true')
$enabled = [bool]$script:Config.enabled -or $envEnabled -or [bool]$RunOnce
$effectiveDryRun = [bool]$DryRun -or ([bool]$script:Config.dry_run_default -and -not $RunOnce)

Write-BridgeLog "pod bridge invoked: repo='$script:RepoRoot' from_hook=$([bool]$FromHook) run_once=$([bool]$RunOnce) dry_run=$effectiveDryRun enabled=$enabled"

if (-not $enabled -and $FromHook) {
    Write-BridgeLog "dispatch disabled; set .claude/pod-bridge.local.json enabled=true or POD_BRIDGE_ENABLED=1 to enable hook dispatch."
    exit 0
}

$taskRoot = Join-RepoPath 'pods\inbox'
$activeRoot = Join-RepoPath 'pods\active'
$archiveRoot = Join-RepoPath 'pods\archive'
foreach ($dir in @($taskRoot, $activeRoot, $archiveRoot)) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
}

$tasks = @(Get-ChildItem -Path $taskRoot -Filter '*.json' -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTimeUtc)
if ($tasks.Count -eq 0) {
    Write-BridgeLog 'no queued task pods found in pods/inbox.'
    exit 0
}

$maxTasks = [int]$script:Config.max_tasks_per_run
if ($maxTasks -lt 1) { $maxTasks = 1 }
$selectedTasks = @($tasks | Select-Object -First $maxTasks)

foreach ($taskFile in $selectedTasks) {
    try {
        $task = Read-JsonFile $taskFile.FullName
        Assert-TaskShape $task $taskFile.FullName
        $taskId = [string]$task.task_id
        $branch = if ($task.PSObject.Properties.Name -contains 'branch' -and $task.branch) { [string]$task.branch } else { "{0}{1}" -f $script:Config.default_branch_prefix, $taskId }
        $activePath = Join-Path $activeRoot $taskFile.Name
        $archivePath = Join-Path $archiveRoot ("{0}.{1}.json" -f $taskId, (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ'))

        if ($effectiveDryRun) {
            Write-BridgeLog "dry run: would claim task '$taskId' from '$($taskFile.FullName)' to '$activePath' and dispatch to branch '$branch'."
            continue
        }

        Move-Item -Path $taskFile.FullName -Destination $activePath -Force
        $task.status = 'active'
        $task | Add-Member -MemberType NoteProperty -Name updated_at -Value ((Get-Date).ToUniversalTime().ToString('o')) -Force
        Write-JsonFile $task $activePath
        Write-BridgeLog "claimed task '$taskId' into pods/active."

        $claudeCommand = [string]$script:Config.claude_command
        $claudeExecutable = Get-Command $claudeCommand -ErrorAction SilentlyContinue
        if (-not $claudeExecutable) {
            $task.status = 'failed'
            $task | Add-Member -MemberType NoteProperty -Name updated_at -Value ((Get-Date).ToUniversalTime().ToString('o')) -Force
            $task | Add-Member -MemberType NoteProperty -Name result -Value ([pscustomobject]@{
                status = 'failed'
                branch = $branch
                commit = $null
                summary = 'Claude Code dispatch could not start.'
                checks = @()
                error = "Claude command '$claudeCommand' was not found on PATH."
            }) -Force
            Write-JsonFile $task $activePath
            Move-Item -Path $activePath -Destination $archivePath -Force
            Write-BridgeLog "task '$taskId' failed: Claude command '$claudeCommand' not found. Archived to '$archivePath'."
            continue
        }

        $relativeActivePath = Resolve-Path -Relative $activePath
        $prompt = [string]$script:Config.prompt_template
        $prompt = $prompt.Replace('{task_path}', $relativeActivePath).Replace('{branch}', $branch).Replace('{task_id}', $taskId).Replace('{title}', [string]$task.title)

        Write-BridgeLog "dispatching task '$taskId' to Claude Code on branch '$branch'."
        $output = & $claudeCommand -p $prompt 2>&1
        $exitCode = $LASTEXITCODE
        if ($output) {
            foreach ($line in $output) {
                Write-BridgeLog "claude: $line"
            }
        }

        if ($exitCode -ne 0) {
            $task = Read-JsonFile $activePath
            $task.status = 'failed'
            $task | Add-Member -MemberType NoteProperty -Name updated_at -Value ((Get-Date).ToUniversalTime().ToString('o')) -Force
            $task | Add-Member -MemberType NoteProperty -Name result -Value ([pscustomobject]@{
                status = 'failed'
                branch = $branch
                commit = $null
                summary = 'Claude Code returned a non-zero exit code.'
                checks = @()
                error = "Exit code: $exitCode"
            }) -Force
            Write-JsonFile $task $activePath
            Move-Item -Path $activePath -Destination $archivePath -Force
            Write-BridgeLog "task '$taskId' failed with exit code $exitCode. Archived to '$archivePath'."
            continue
        }

        Write-BridgeLog "task '$taskId' dispatch completed. Claude Code is responsible for implementation commit and pod archiving."
    }
    catch {
        Write-BridgeLog "error while processing '$($taskFile.FullName)': $($_.Exception.Message)"
        if ($FromHook) { continue }
        throw
    }
}

exit 0
