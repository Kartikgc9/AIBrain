# setup_scheduler.ps1
# -----------------------------------------------------------------------
# Registers a Windows Task Scheduler task that runs auto_commit.py once
# every 24 hours.  Run this script ONCE as Administrator.
#
# Usage:
#   Right-click PowerShell → "Run as administrator"
#   cd d:\AIBrain
#   .\setup_scheduler.ps1
# -----------------------------------------------------------------------

# ── Config ----------------------------------------------------------------
$TaskName   = "AIBrain-AutoCommit"
$ScriptPath = "$PSScriptRoot\auto_commit.py"          # auto_commit.py location
$PythonExe  = (Get-Command python -ErrorAction Stop).Source   # auto-detect python

# Start time: today at 14:00 local time (edit to your preference)
$StartTime  = "14:00"
# -------------------------------------------------------------------------

Write-Host ""
Write-Host "=== AIBrain Auto-Commit Scheduler Setup ===" -ForegroundColor Cyan
Write-Host "Python  : $PythonExe"
Write-Host "Script  : $ScriptPath"
Write-Host "Schedule: Daily at $StartTime"
Write-Host ""

# Remove old task if it already exists
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Write-Host "Removing existing task '$TaskName'..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Define the action: run python auto_commit.py
$Action = New-ScheduledTaskAction `
    -Execute  $PythonExe `
    -Argument "`"$ScriptPath`"" `
    -WorkingDirectory "$PSScriptRoot"

# Trigger: daily, starting today at $StartTime, indefinitely
$Trigger = New-ScheduledTaskTrigger `
    -Daily `
    -At $StartTime

# Settings: run even on battery, start if missed, etc.
$Settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit  (New-TimeSpan -Minutes 10) `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -MultipleInstances   IgnoreNew

# Register
Register-ScheduledTask `
    -TaskName  $TaskName `
    -Action    $Action `
    -Trigger   $Trigger `
    -Settings  $Settings `
    -RunLevel  Highest `
    -Force | Out-Null

Write-Host "Task '$TaskName' registered successfully." -ForegroundColor Green
Write-Host ""
Write-Host "Tip: To run it immediately for testing, use:"
Write-Host "     Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "Or run the script directly:"
Write-Host "     python `"$ScriptPath`""
Write-Host ""
