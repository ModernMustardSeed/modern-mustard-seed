@echo off
REM Supervisor for the demo-site build worker.
REM
REM The 2026-07-23 to 07-28 outage happened because BOTH roads were closed at
REM once: this worker was not running and nobody noticed, and the GitHub Actions
REM failsafe had been disabled_manually since 07-22. So this now (a) starts at
REM logon from the Startup folder, needing no admin, and (b) restarts itself if
REM the worker ever exits, instead of dying quietly until somebody looks.
REM The repo root is derived from THIS FILE's own location (%~dp0 is scripts\),
REM never hardcoded. A hardcoded path is what broke the build worker on 2026-08-13:
REM this line said C:\Users\moder\modern-mustard-seed, the old machine's clone, so on
REM the new machine the cd failed, node never found the script, and the supervisor
REM spun forever building nothing while two leads sat queued for 12 hours. The
REM forge-to-build rename rewrote both of these files from a pre-fix copy and put
REM that same path back, so it is spelled out again: `cd /d` to a missing directory
REM FAILS and the shell carries on anyway, which is why this failure is silent.
REM Deriving the path leaves nothing to miss the next time the repo moves, and it is
REM what lets the worker run from its own production checkout instead of a tree
REM other sessions are rewriting.
cd /d "%~dp0.."
:loop
echo [%DATE% %TIME%] starting build worker >> "%LOCALAPPDATA%\Temp\build-worker.log"
node scripts\demo-site-worker.mjs >> "%LOCALAPPDATA%\Temp\build-worker.log" 2>&1
echo [%DATE% %TIME%] worker exited, restarting in 30s >> "%LOCALAPPDATA%\Temp\build-worker.log"
timeout /t 30 /nobreak > nul
goto loop
