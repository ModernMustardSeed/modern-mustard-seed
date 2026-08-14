@echo off
REM Supervisor for the demo-site forge worker.
REM
REM The 2026-07-23 to 07-28 outage happened because BOTH roads were closed at
REM once: this worker was not running and nobody noticed, and the GitHub Actions
REM failsafe had been disabled_manually since 07-22. So this now (a) starts at
REM logon from the Startup folder, needing no admin, and (b) restarts itself if
REM the worker ever exits, instead of dying quietly until somebody looks.
REM Repo root from this file's own location, never a hardcoded machine path.
REM See the note in forge-worker-watchdog.cmd for what the hardcoded one cost.
cd /d "%~dp0.."
:loop
echo [%DATE% %TIME%] starting forge worker >> "%LOCALAPPDATA%\Temp\forge-worker.log"
node scripts\demo-site-worker.mjs >> "%LOCALAPPDATA%\Temp\forge-worker.log" 2>&1
echo [%DATE% %TIME%] worker exited, restarting in 30s >> "%LOCALAPPDATA%\Temp\forge-worker.log"
timeout /t 30 /nobreak > nul
goto loop
