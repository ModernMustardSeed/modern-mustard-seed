@echo off
REM Supervisor for the local audit worker, same shape as build-worker-start.cmd.
REM
REM The build taught this lesson the expensive way: a worker with no auto-start
REM only runs when somebody remembers, and a worker that exits quietly is
REM indistinguishable from a working one that has nothing to do. Both roads were
REM shut for five days in July before anyone noticed.
REM
REM So this restarts on any exit, and the worker heartbeats into app_state on
REM every poll. When the heartbeat goes stale the Vercel routes stop waiting on
REM this machine and fall back to the metered API on their own, which means a
REM dead worker costs money rather than costing audits.
REM
REM Install: put a shortcut to this file in
REM   %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
REM (Task Scheduler is denied on this machine, no admin rights.)
REM The repo path, and it has been wrong since this file was written: it pointed
REM at C:\Users\moder\modern-mustard-seed, which does not exist on this machine.
REM `cd /d` to a missing directory fails, the shell carries on anyway, and npx
REM then runs from wherever the shortcut happened to start. So the supervisor
REM never audited anything, there is no audit-worker.log to show for it, and
REM every audit quietly went to the metered API instead of the subscription.
REM Corrected 2026-08-11. Same lesson as the roadmap queue in migration 091: a
REM free engine nobody can reach is not a free engine.
REM Repo root from this file's own location, never a hardcoded machine path.
REM See the note in forge-worker-watchdog.cmd for what the hardcoded one cost.
cd /d "%~dp0.."
:loop
echo [%DATE% %TIME%] starting audit worker >> "%LOCALAPPDATA%\Temp\audit-worker.log"
npx tsx scripts\audit-worker.mts >> "%LOCALAPPDATA%\Temp\audit-worker.log" 2>&1
echo [%DATE% %TIME%] audit worker exited, restarting in 30s >> "%LOCALAPPDATA%\Temp\audit-worker.log"
timeout /t 30 /nobreak > nul
goto loop
