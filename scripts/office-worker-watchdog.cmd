@echo off
REM Outer supervisor for Yield, the agentic office (scripts\office\worker.mjs).
REM
REM Every chat turn with Sower and every agent's task on the floor at
REM /admin/office runs through this worker on the Max subscription. With it
REM down, the admin still takes messages and queues them, and the dock says the
REM floor is asleep; everything runs the moment it comes back.
REM
REM Same two-layer shape as llm-worker-watchdog.cmd. Repo root derives from this
REM file's own location, never a hardcoded path.
cd /d "%~dp0.."
:loop
echo [%DATE% %TIME%] starting office worker watchdog >> "%LOCALAPPDATA%\Temp\office-worker.log"
node scripts\worker-watchdog.mjs --name office --script scripts\office\worker.mjs >> "%LOCALAPPDATA%\Temp\office-worker.log" 2>&1
echo [%DATE% %TIME%] office worker watchdog exited, restarting in 10s >> "%LOCALAPPDATA%\Temp\office-worker.log"
timeout /t 10 /nobreak > nul
goto loop
