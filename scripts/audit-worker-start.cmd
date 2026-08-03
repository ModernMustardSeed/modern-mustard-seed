@echo off
REM Supervisor for the local audit worker, same shape as forge-worker-start.cmd.
REM
REM The forge taught this lesson the expensive way: a worker with no auto-start
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
cd /d C:\Users\moder\modern-mustard-seed
:loop
echo [%DATE% %TIME%] starting audit worker >> "%LOCALAPPDATA%\Temp\audit-worker.log"
npx tsx scripts\audit-worker.mts >> "%LOCALAPPDATA%\Temp\audit-worker.log" 2>&1
echo [%DATE% %TIME%] audit worker exited, restarting in 30s >> "%LOCALAPPDATA%\Temp\audit-worker.log"
timeout /t 30 /nobreak > nul
goto loop
