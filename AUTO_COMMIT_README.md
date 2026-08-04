# AIBrain Auto-Commit System

Automatically updates `tracker.py` with a commit counter + uptime timer, then commits and pushes to GitHub every 24 hours.

## Files

| File | Purpose |
|------|---------|
| `tracker.py` | Auto-updated file — holds commit count & uptime |
| `auto_commit.py` | Core script: updates tracker → git add/commit/push |
| `auto_commit.log` | Appended log of every run (gitignored) |
| `setup_scheduler.ps1` | One-time Windows Task Scheduler registration |

## Quick Start

### 1. Prerequisites
- Python 3.8+ in `PATH`  
- Git configured with your identity (`git config --global user.email` / `user.name`)  
- The repo already has a remote (`git remote -v` should show `origin`)  
- Auth: either SSH key, credential manager, or a GitHub PAT stored in the Windows Credential Manager so `git push` works without a password prompt

### 2. Install the scheduled task (run once, as Administrator)

```powershell
# Open PowerShell as Administrator, then:
cd d:\AIBrain
.\setup_scheduler.ps1
```

The task runs daily at **14:00 local time**. To change the time, edit `$StartTime` in `setup_scheduler.ps1` before running.

### 3. Test immediately

```powershell
python d:\AIBrain\auto_commit.py
```

Or trigger via Task Scheduler:

```powershell
Start-ScheduledTask -TaskName "AIBrain-AutoCommit"
```

### 4. Verify

```powershell
# Check last run result
Get-ScheduledTaskInfo -TaskName "AIBrain-AutoCommit"

# View the log
Get-Content d:\AIBrain\auto_commit.log -Tail 20
```

## What `tracker.py` looks like after a few runs

```python
COMMIT_COUNT  = 3
FIRST_RUN_UTC = "2026-08-04T09:00:00Z"
LAST_RUN_UTC  = "2026-08-06T09:00:02Z"
UPTIME_DAYS   = 2
UPTIME_HOURS  = 48.0
SUMMARY       = "Run #3 on 2026-08-06 09:00 UTC | Uptime: 2d 48.0h since first run"
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `git push` fails with auth error | Set up SSH key or Windows Credential Manager with a GitHub PAT |
| Python not found | Hardcode `$PythonExe` in `setup_scheduler.ps1` (e.g. `C:\Python312\python.exe`) |
| Task doesn't run when PC is off | Task will catch up on next available time (`-StartWhenAvailable` is set) |

## Uninstall

```powershell
Unregister-ScheduledTask -TaskName "AIBrain-AutoCommit" -Confirm:$false
```
