@echo off
REM Supervisor for the local roadmap worker, same shape as audit-worker-start.cmd.
REM
REM The build taught this lesson the expensive way: a worker with no auto-start
REM only runs when somebody remembers, and a worker that exits quietly is
REM indistinguishable from a working one that has nothing to do. Both roads were
REM shut for five days in July before anyone noticed.
REM
REM So this restarts on any exit, and the worker heartbeats into app_state on
REM every poll. When the heartbeat goes stale the public route stops waiting on
REM this machine and falls back to the metered API on its own. If that is also
REM unavailable the request is still QUEUED rather than lost, and this worker
REM drains the backlog the next time it comes up.
REM
REM Install: put a shortcut to this file in
REM   %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
REM (Task Scheduler is denied on this machine, no admin rights.)
REM Repo root from this file's own location, never a hardcoded machine path.
REM See the note in forge-worker-watchdog.cmd for what the hardcoded one cost.
cd /d "%~dp0.."
:loop
echo [%DATE% %TIME%] starting roadmap worker >> "%LOCALAPPDATA%\Temp\roadmap-worker.log"
npx tsx scripts\roadmap-worker.mts >> "%LOCALAPPDATA%\Temp\roadmap-worker.log" 2>&1
echo [%DATE% %TIME%] roadmap worker exited, restarting in 30s >> "%LOCALAPPDATA%\Temp\roadmap-worker.log"
timeout /t 30 /nobreak > nul
goto loop
