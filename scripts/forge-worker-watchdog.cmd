@echo off
REM Outer supervisor for the forge worker watchdog.
REM
REM Two layers on purpose. The inner layer (worker-watchdog.mjs) restarts the
REM worker, beats cove_heartbeats, and alerts the office when it crash-loops.
REM This outer loop exists only so that a death of the watchdog ITSELF is not
REM the new silent failure. Replaces the old forge-worker-start.cmd, which
REM restarted the worker but told nobody (the 8/02 lesson).
cd /d C:\Users\moder\modern-mustard-seed
:loop
echo [%DATE% %TIME%] starting forge worker watchdog >> "%LOCALAPPDATA%\Temp\forge-worker.log"
node scripts\worker-watchdog.mjs --name forge --script scripts\demo-site-worker.mjs >> "%LOCALAPPDATA%\Temp\forge-worker.log" 2>&1
echo [%DATE% %TIME%] watchdog exited, restarting in 30s >> "%LOCALAPPDATA%\Temp\forge-worker.log"
timeout /t 30 /nobreak > nul
goto loop
