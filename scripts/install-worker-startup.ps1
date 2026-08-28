<#
.SYNOPSIS
  Put both workstation workers in the Startup folder so a reboot brings them back.

.DESCRIPTION
  Two workers have to be awake for the admin to behave the way it promises:

    build  scripts\demo-site-worker.mjs   builds every demo site. The GitHub
           fallback refuses demos on purpose (a one-shot API build reads as slop),
           so if this is down, no demo gets built anywhere, at all.

    llm    scripts\llm-worker.mjs         answers every prompt Vercel queues into
           llm_jobs. The Run Audit button waits 95 seconds for an answer. The
           GitHub drainer runs on a best-effort cron that lands every 20 to 40
           minutes, so without this one awake the button always times out and
           reads as broken, even though the audit does eventually get written.

  Only `build` had a Startup entry. That is why the audit button was dead on
  2026-08-25 while the queue was healthy.

  Point this at the PRODUCTION checkout, never a working lane. The default is the
  repo this script is in.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\install-worker-startup.ps1
#>
[CmdletBinding()]
param(
  [string]$Repo = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$startup = [Environment]::GetFolderPath('Startup')
$shell = New-Object -ComObject WScript.Shell

$entries = @(
  @{ Name = 'MMS Build Worker'; Cmd = 'build-worker-watchdog.cmd' }
  @{ Name = 'MMS LLM Worker';   Cmd = 'llm-worker-watchdog.cmd' }
)

foreach ($e in $entries) {
  $target = Join-Path $Repo "scripts\$($e.Cmd)"
  if (-not (Test-Path $target)) { Write-Host "[startup] MISSING, skipped: $target"; continue }

  $link = Join-Path $startup "$($e.Name).lnk"
  $sc = $shell.CreateShortcut($link)
  $sc.TargetPath = $target
  $sc.WorkingDirectory = $Repo
  # Minimized, not hidden: a window in the taskbar is how Sarah can tell at a
  # glance that the floor is up without opening a terminal.
  $sc.WindowStyle = 7
  $sc.Description = "$($e.Name) supervisor ($Repo)"
  $sc.Save()
  Write-Host "[startup] $($e.Name) -> $target"
}

Write-Host "[startup] Startup folder: $startup"
Get-ChildItem $startup -Filter '*.lnk' | Select-Object Name, LastWriteTime | Format-Table -AutoSize | Out-String -Width 100 | Write-Host
