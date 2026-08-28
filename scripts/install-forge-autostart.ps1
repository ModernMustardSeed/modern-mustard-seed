<#
  Install the forge worker's auto-start on THIS machine.

  Why this exists: on 2026-08-13 the forge stopped building anything on the new
  machine. Two causes, both silent. (1) scripts\forge-worker-watchdog.cmd still
  said `cd /d C:\Users\moder\modern-mustard-seed`, the old machine's clone, so the
  cd failed and node never found the worker script. That is fixed; the .cmd files
  now derive the repo root from their own location. (2) Nothing on the new machine
  ever started the supervisor: the Startup folder was empty and there was no
  scheduled task. A worker nobody starts is indistinguishable from a broken one.

  Run it once per machine, from anywhere, no admin needed:

      powershell -ExecutionPolicy Bypass -File scripts\install-forge-autostart.ps1

  Add -Uninstall to remove the entry, -All to also auto-start the audit and
  roadmap workers.
#>
[CmdletBinding()]
param(
  [switch]$All,
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

# The repo root is this script's parent directory, so the installer is as
# path-independent as the .cmd files it installs.
$repo    = Split-Path -Parent $PSScriptRoot
$startup = [Environment]::GetFolderPath('Startup')

$workers = @(
  @{ Name = 'MMS Forge Worker';   Cmd = 'forge-worker-watchdog.cmd'; Always = $true  },
  @{ Name = 'MMS Audit Worker';   Cmd = 'audit-worker-start.cmd';    Always = $false },
  @{ Name = 'MMS Roadmap Worker'; Cmd = 'roadmap-worker-start.cmd';  Always = $false }
)

$shell = New-Object -ComObject WScript.Shell

foreach ($w in $workers) {
  if (-not $w.Always -and -not $All) { continue }

  $target = Join-Path $repo "scripts\$($w.Cmd)"
  $link   = Join-Path $startup "$($w.Name).lnk"

  if ($Uninstall) {
    if (Test-Path $link) { Remove-Item $link -Force; Write-Host "removed  $($w.Name)" }
    else { Write-Host "not installed  $($w.Name)" }
    continue
  }

  if (-not (Test-Path $target)) {
    Write-Warning "skipping $($w.Name): $target does not exist"
    continue
  }

  $sc = $shell.CreateShortcut($link)
  $sc.TargetPath       = $target
  $sc.WorkingDirectory = $repo
  $sc.WindowStyle      = 7   # minimized, so a logon does not throw a console in her face
  $sc.Description      = "Supervises an MMS background worker. Restarts it on exit, heartbeats to Supabase, escalates a crash loop."
  $sc.Save()
  Write-Host "installed  $($w.Name)  ->  $target"
}

if (-not $Uninstall) {
  Write-Host ''
  Write-Host "Startup folder: $startup"
  Write-Host 'It runs at your next logon. To start it right now without rebooting:'
  Write-Host "  Start-Process `"$repo\scripts\forge-worker-watchdog.cmd`" -WindowStyle Minimized"
  Write-Host ''
  Write-Host 'Log:  $env:LOCALAPPDATA\Temp\forge-worker.log'
}
