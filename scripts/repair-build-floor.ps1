<#
.SYNOPSIS
  Put the build floor back on its feet after escaped build agents wedge it.

.DESCRIPTION
  Written 2026-08-25, after this exact failure:

    The documented restart is `Stop-Process` on node.exe. That kills the worker
    and its `cmd /c` wrapper and leaves the claude.exe GRANDCHILD building. The
    escapee keeps writing into ~/mms-demo-sites/<id>, which is the same directory
    the next attempt at that job gets, so it overwrites the new run's index.html
    underneath it. Three escapees were loose at once. Both lanes were held by
    builds that could see their own files changing, said so, and never finished.
    Five real leads sat four hours behind them.

  This does the whole recovery in the one order that works:

    1. Kill every escaped build agent, tree and all.
    2. Stop the worker and its watchdog, tree and all.
    3. Wipe the build directory of any job left mid-flight, so the next attempt
       starts from a clean slate instead of inheriting a trampled one.
    4. Start the worker again. Its own startup sweep hands every row this machine
       was holding back to the queue, and leads now outrank housekeeping.
    5. Start the LLM drainer, which is what makes the Run Audit button answer
       inside the request instead of forty minutes later.

  Safe to run at any time. Every step is a no-op when there is nothing to do.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\repair-build-floor.ps1
#>
[CmdletBinding()]
param(
  # Show what would be killed and stopped, change nothing.
  [switch]$WhatIfOnly
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot

function Say([string]$m) { Write-Host "[repair] $m" }

function Kill-Tree([int]$id, [string]$why) {
  if ($WhatIfOnly) { Say "would kill $id ($why)"; return }
  # taskkill /T walks the tree down from the wrapper. Stop-Process does not, and
  # that is the entire bug this script exists to clean up after.
  & taskkill /PID $id /T /F 2>&1 | Out-Null
  Say "killed $id ($why)"
}

# ---------------------------------------------------------------- 1. escapees
# A build agent's signature is print mode plus stream-json plus strict-mcp-config.
# Sarah's interactive sessions are claude.exe with no -p, so they never match.
$agents = Get-CimInstance Win32_Process -Filter "Name='claude.exe'" |
  Where-Object {
    $_.CommandLine -match '--output-format stream-json' -and
    $_.CommandLine -match '--strict-mcp-config' -and
    $_.CommandLine -match ' -p '
  }

$escaped = @($agents | Where-Object {
  $null -eq (Get-CimInstance Win32_Process -Filter "ProcessId=$($_.ParentProcessId)" -ErrorAction SilentlyContinue)
})

if ($escaped.Count -eq 0) { Say 'no escaped build agents' }
foreach ($a in $escaped) { Kill-Tree $a.ProcessId "escaped build agent, started $($a.CreationDate)" }

# --------------------------------------------------------------- 2. the worker
#
# THREE LAYERS, AND THE OUTER ONE IS THE EASY ONE TO MISS. build-worker-watchdog.cmd
# is a `:loop` in cmd.exe: kill the node watchdog under it and it starts another one
# thirty seconds later. A repair that kills only node and then starts a fresh
# supervisor leaves TWO supervisors running, which is two workers, which is the
# double-claim this whole file exists to clean up after. So the cmd.exe loop is what
# gets killed, and /T takes the node watchdog and the build agents down with it.
$workers = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'demo-site-worker|worker-watchdog(\.mjs)? --name build' })

if ($workers.Count -eq 0) { Say 'build worker was not running' }

$supervisors = @{}
foreach ($w in $workers) {
  $par = Get-CimInstance Win32_Process -Filter "ProcessId=$($w.ParentProcessId)" -ErrorAction SilentlyContinue
  # Only ever the .cmd loop itself. Its own parent is explorer or a shell, and
  # killing that would take the desktop or this session with it.
  if ($par -and $par.Name -eq 'cmd.exe' -and $par.CommandLine -match 'build-worker-watchdog') {
    $supervisors[[int]$par.ProcessId] = $true
  } else {
    Kill-Tree $w.ProcessId 'build worker'
  }
}
foreach ($id in $supervisors.Keys) { Kill-Tree $id 'build worker supervisor loop (takes the tree with it)' }

# Anything still holding a build after the tree kills is the remainder: agents
# whose parent was alive a moment ago because it was the worker we just stopped.
Start-Sleep -Seconds 2
$left = @(Get-CimInstance Win32_Process -Filter "Name='claude.exe'" |
  Where-Object {
    $_.CommandLine -match '--output-format stream-json' -and
    $_.CommandLine -match '--strict-mcp-config' -and
    $_.CommandLine -match ' -p '
  })
foreach ($a in $left) { Kill-Tree $a.ProcessId 'build agent orphaned by the stop above' }

# The outer .cmd supervisor relaunches the watchdog after 30s, so give the tree
# kill a moment to be the last word before anything is started again.
if (-not $WhatIfOnly) { Start-Sleep -Seconds 3 }

# ------------------------------------------------- 3. trampled build directories
# A directory whose files were written by more than one agent is not a build in
# progress, it is wreckage. The finished html of every job that ever reached
# 'ready' is banked in the database, so nothing here is the only copy.
$sitesDir = Join-Path $env:USERPROFILE 'mms-demo-sites'
if (Test-Path $sitesDir) {
  # From the repo, always. wedged-build-ids.mjs reads .env.local out of the
  # working directory, so a repair run from anywhere else silently finds no
  # credentials, prints nothing, and clears nothing.
  #
  # No `2>$null` either: in Windows PowerShell 5.1 redirecting a native exe's
  # stderr wraps every line in a NativeCommandError, which under
  # $ErrorActionPreference = 'Stop' aborts the repair before it restarts anything.
  $ids = @()
  Push-Location $repo
  try { $ids = @(& (Get-Command node).Source (Join-Path $repo 'scripts\wedged-build-ids.mjs')) }
  catch { Say "could not read the wedged build ids (skipping the directory sweep): $($_.Exception.Message)" }
  finally { Pop-Location }
  foreach ($id in @($ids | Where-Object { $_ -match '^[0-9a-f-]{36}$' })) {
    $dir = Join-Path $sitesDir $id
    if (Test-Path $dir) {
      if ($WhatIfOnly) { Say "would clear $dir" }
      else { Remove-Item -Recurse -Force $dir; Say "cleared the trampled build directory for $id" }
    }
  }
}

if ($WhatIfOnly) { Say 'dry run, nothing started'; return }

# ------------------------------------------------------------ 4 & 5. start them
$build = Join-Path $repo 'scripts\build-worker-watchdog.cmd'
$llm   = Join-Path $repo 'scripts\llm-worker-watchdog.cmd'

Start-Process -WindowStyle Minimized -FilePath $build
Say "build worker started from $repo"

if (-not (Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
          Where-Object { $_.CommandLine -match 'llm-worker' })) {
  Start-Process -WindowStyle Minimized -FilePath $llm
  Say "llm drainer started from $repo"
} else {
  Say 'llm drainer already running'
}

Start-Sleep -Seconds 5
Say 'running now:'
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'demo-site-worker|llm-worker|worker-watchdog' } |
  Select-Object ProcessId, @{n = 'what'; e = { if ($_.CommandLine -match 'llm') { 'llm drainer' } elseif ($_.CommandLine -match 'watchdog') { 'build watchdog' } else { 'build worker' } } } |
  Format-Table -AutoSize | Out-String -Width 100 | Write-Host
