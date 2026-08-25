@echo off
REM Supervisor for the demo-site build worker.
REM
REM The 2026-07-23 to 07-28 outage happened because BOTH roads were closed at
REM once: this worker was not running and nobody noticed, and the GitHub Actions
REM failsafe had been disabled_manually since 07-22. So this now (a) starts at
REM logon from the Startup folder, needing no admin, and (b) restarts itself if
REM the worker ever exits, instead of dying quietly until somebody looks.
cd /d C:\Users\moder\modern-mustard-seed
:loop
echo [%DATE% %TIME%] starting build worker >> "%LOCALAPPDATA%\Temp\build-worker.log"
node scripts\demo-site-worker.mjs >> "%LOCALAPPDATA%\Temp\build-worker.log" 2>&1
echo [%DATE% %TIME%] worker exited, restarting in 30s >> "%LOCALAPPDATA%\Temp\build-worker.log"
timeout /t 30 /nobreak > nul
goto loop
