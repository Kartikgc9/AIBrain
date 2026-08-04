"""
auto_commit.py
--------------
Reads the current state from tracker.py, increments the commit counter,
calculates uptime, rewrites tracker.py with fresh values, then commits
and pushes the change to the remote GitHub repository.

Designed to be called by Windows Task Scheduler every 24 hours.
"""

import subprocess
import sys
import ast
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path

# ── Config ─────────────────────────────────────────────────────────────────────
REPO_DIR     = Path(__file__).parent.resolve()   # root of the AIBrain repo
TRACKER_FILE = REPO_DIR / "tracker.py"
LOG_FILE     = REPO_DIR / "auto_commit.log"

# ── Helpers ────────────────────────────────────────────────────────────────────

def log(msg: str) -> None:
    """Append a timestamped log line to auto_commit.log."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    line = f"[{now}] {msg}"
    print(line)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def read_tracker() -> dict:
    """Parse tracker.py and return its top-level assignments as a dict."""
    source = TRACKER_FILE.read_text(encoding="utf-8")
    tree   = ast.parse(source)
    data   = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    try:
                        data[target.id] = ast.literal_eval(node.value)
                    except Exception:
                        pass
    return data


def write_tracker(count: int, first_run: str, last_run: str,
                  uptime_days: int, uptime_hours: float, summary: str) -> None:
    """Overwrite tracker.py with the new values (preserves header comments)."""
    content = f'''\
# tracker.py
# This file is automatically updated every 24 hours by auto_commit.py
# DO NOT edit manually — changes will be overwritten.

# ── Stats ──────────────────────────────────────────────────────────────────────
COMMIT_COUNT  = {count}
FIRST_RUN_UTC = "{first_run}"          # ISO-8601 timestamp of first ever run
LAST_RUN_UTC  = "{last_run}"          # ISO-8601 timestamp of the most recent run

# ── Human-readable summary ─────────────────────────────────────────────────────
UPTIME_DAYS   = {uptime_days}           # calendar days since first run
UPTIME_HOURS  = {round(uptime_hours, 2)}           # total hours since first run (fractional)
SUMMARY       = "{summary}"
'''
    TRACKER_FILE.write_text(content, encoding="utf-8")


def run_git(*args) -> tuple[int, str, str]:
    """Run a git command and return (returncode, stdout, stderr)."""
    cmd = ["git", "-C", str(REPO_DIR)] + list(args)
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode, result.stdout.strip(), result.stderr.strip()


def compute_uptime(first_str: str, now: datetime) -> tuple[int, float]:
    """Return (calendar_days, total_hours) since first_str (ISO-8601 UTC)."""
    first = datetime.fromisoformat(first_str.replace("Z", "+00:00"))
    delta = now - first
    days  = delta.days
    hours = delta.total_seconds() / 3600.0
    return days, hours


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> int:
    log("─" * 60)
    log("auto_commit.py started")

    now_utc    = datetime.now(timezone.utc)
    now_str    = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
    now_human  = now_utc.strftime("%Y-%m-%d %H:%M UTC")

    # 1. Read current tracker state
    try:
        state = read_tracker()
    except Exception as exc:
        log(f"ERROR reading tracker.py: {exc}")
        return 1

    count     = int(state.get("COMMIT_COUNT",  0))
    first_run = state.get("FIRST_RUN_UTC", "").strip()
    last_run  = state.get("LAST_RUN_UTC",  "").strip()

    # 2. Increment counter
    count += 1
    log(f"Commit #{count}")

    # 3. Preserve or set first-run timestamp
    if not first_run:
        first_run = now_str
        log(f"First run recorded: {first_run}")

    # 4. Compute uptime
    uptime_days, uptime_hours = compute_uptime(first_run, now_utc)

    # 5. Build summary string
    summary = (
        f"Run #{count} on {now_human} | "
        f"Uptime: {uptime_days}d {uptime_hours:.1f}h since first run"
    )

    # 6. Write updated tracker.py
    try:
        write_tracker(count, first_run, now_str, uptime_days, uptime_hours, summary)
        log("tracker.py updated successfully")
    except Exception as exc:
        log(f"ERROR writing tracker.py: {exc}")
        return 1

    # 7. Pull --rebase to sync with remote before committing
    rc, out, err = run_git("pull", "--rebase", "--autostash")
    if rc != 0:
        log(f"ERROR git pull --rebase: {err or out}")
        run_git("rebase", "--abort")   # leave repo in a clean state
        return 1
    log("git pull --rebase ✓")

    # 8. Git add
    rc, out, err = run_git("add", "tracker.py")
    if rc != 0:
        log(f"ERROR git add: {err}")
        return 1
    log("git add tracker.py ✓")

    # 9. Git commit
    commit_msg = f"chore(tracker): auto-update #{count} — {now_human}"
    rc, out, err = run_git("commit", "-m", commit_msg)
    if rc != 0:
        log(f"ERROR git commit: {err or out}")
        return 1
    log(f"git commit ✓  → {commit_msg}")

    # 10. Git push
    rc, out, err = run_git("push")
    if rc != 0:
        log(f"ERROR git push: {err}")
        return 1
    log("git push ✓")

    log("auto_commit.py completed successfully")
    return 0


if __name__ == "__main__":
    sys.exit(main())
