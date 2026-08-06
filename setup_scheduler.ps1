# setup_scheduler.ps1
# -----------------------------------------------------------------------
# Registers a Windows Task Scheduler task that runs auto_commit.py:
#   • Daily at 14:00 IST  (primary trigger)
#   • At every logon      (catch-up trigger: fires if 14:00 was missed
#                          while the laptop was off; auto_commit.py itself
#                          skips the run if it already committed today)
#
# Run this script ONCE as Administrator.
#
# Usage:
#   Right-click PowerShell -> "Run as administrator"
#   cd d:\AIBrain
#   .\setup_scheduler.ps1
# -----------------------------------------------------------------------

# -- Config ----------------------------------------------------------------
$TaskName   = "AIBrain-AutoCommit"
$ScriptPath = "$PSScriptRoot\auto_commit.py"
$PythonExe  = (Get-Command python -ErrorAction Stop).Source   # auto-detect python

# Primary schedule: daily at this local time
$StartTime  = "14:00"
# -------------------------------------------------------------------------

Write-Host ""
Write-Host "=== AIBrain Auto-Commit Scheduler Setup ===" -ForegroundColor Cyan
Write-Host "Python  : $PythonExe"
Write-Host "Script  : $ScriptPath"
Write-Host "Schedule: Daily at $StartTime  +  at every logon (catch-up)"
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

# Trigger 1: daily at 14:00 (runs normally when laptop is on)
$TriggerDaily = New-ScheduledTaskTrigger `
    -Daily `
    -At $StartTime

# Trigger 2: at logon (catch-up -- fires when laptop wakes after a missed 14:00)
# auto_commit.py's idempotency guard ensures it's a no-op if already ran today.
$TriggerLogon = New-ScheduledTaskTrigger -AtLogOn

# Settings
$Settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit       (New-TimeSpan -Minutes 10) `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -MultipleInstances        IgnoreNew

# Register with BOTH triggers
Register-ScheduledTask `
    -TaskName  $TaskName `
    -Action    $Action `
    -Trigger   @($TriggerDaily, $TriggerLogon) `
    -Settings  $Settings `
    -RunLevel  Highest `
    -Force | Out-Null

Write-Host "Task '$TaskName' registered successfully." -ForegroundColor Green
Write-Host ""
Write-Host "Triggers:"
Write-Host "  1. Daily at $StartTime local time"
Write-Host "  2. At every logon (no-op if already committed today)"
Write-Host ""
Write-Host "Tip: To run it immediately for testing, use:"
Write-Host "     Start-ScheduledTask -TaskName 'AIBrain-AutoCommit'"
Write-Host "Or run the script directly:"
Write-Host "     python `"$ScriptPath`""
Write-Host ""
