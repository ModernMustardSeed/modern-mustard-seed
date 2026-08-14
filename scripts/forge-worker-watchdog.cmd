@echo off
REM Outer supervisor for the forge worker watchdog.
REM
REM Two layers on purpose. The inner layer (worker-watchdog.mjs) restarts the
REM worker, beats cove_heartbeats, and alerts the office when it crash-loops.
REM This outer loop exists only so that a death of the watchdog ITSELF is not
REM the new silent failure. Replaces the old forge-worker-start.cmd, which
REM restarted the worker but told nobody (the 8/02 lesson).
REM The repo root is derived from THIS FILE's own location (%~dp0 is scripts\),
REM never hardcoded. A hardcoded path is what broke the forge on 2026-08-13: this
REM line still said C:\Users\moder\modern-mustard-seed, the old machine's clone, so
REM on the new machine the cd failed, node never found the script, and the
REM supervisor spun forever building nothing while two leads sat queued for 12
REM hours. audit-worker-start.cmd and roadmap-worker-start.cmd had been repointed
REM by hand; these two were missed. Deriving the path means there is nothing left
REM to miss the next time the repo moves.
cd /d "%~dp0.."
:loop
echo [%DATE% %TIME%] starting forge worker watchdog >> "%LOCALAPPDATA%\Temp\forge-worker.log"
node scripts\worker-watchdog.mjs --name forge --script scripts\demo-site-worker.mjs >> "%LOCALAPPDATA%\Temp\forge-worker.log" 2>&1
echo [%DATE% %TIME%] watchdog exited, restarting in 30s >> "%LOCALAPPDATA%\Temp\forge-worker.log"
timeout /t 30 /nobreak > nul
goto loop
