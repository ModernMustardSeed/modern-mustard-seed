@echo off
REM Outer supervisor for the LLM drainer (scripts\llm-worker.mjs).
REM
REM Why this exists (2026-08-25): the presence audit's website grade, and every
REM other route that runs a prompt from Vercel, hands the work to the llm_jobs
REM queue and waits up to 95 seconds for a drainer. The GitHub drainer is
REM best-effort and lands every 30 to 60 minutes, so without this worker awake
REM the Run Audit button returns a report with the website pillar withheld.
REM With it awake the pickup is sub-second and the button does the whole job.
REM
REM Same two-layer shape as forge-worker-watchdog.cmd: the inner watchdog
REM restarts the worker and heartbeats; this loop only exists so a death of the
REM watchdog itself is not a silent failure. Repo root derives from this file's
REM own location, never a hardcoded path (see the note in
REM forge-worker-watchdog.cmd for what a hardcoded one cost).
cd /d "%~dp0.."
:loop
echo [%DATE% %TIME%] starting llm worker watchdog >> "%LOCALAPPDATA%\Temp\llm-worker.log"
node scripts\worker-watchdog.mjs --name llm --script scripts\llm-worker.mjs >> "%LOCALAPPDATA%\Temp\llm-worker.log" 2>&1
echo [%DATE% %TIME%] llm worker watchdog exited, restarting in 10s >> "%LOCALAPPDATA%\Temp\llm-worker.log"
timeout /t 10 /nobreak > nul
goto loop
