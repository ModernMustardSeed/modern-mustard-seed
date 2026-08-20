# Set one production environment variable on Vercel with the exact bytes given.
#
#   .\scripts\vercel-env-set.ps1 -Name ADMIN_PASSWORD -Value "Easton12"
#
# Why this exists: piping a string from PowerShell into the vercel CLI
# (`"value" | vercel env add ...`) prepends a UTF-8 byte order mark. The CLI
# strips the trailing newline but keeps the BOM, so the stored value becomes
# "﻿value" and every consumer (Basic Auth, pixel ids, API tokens) fails
# in ways that look like the variable was never applied. This writes the
# value to a BOM-free temp file and feeds it to the CLI through cmd stdin.
param(
  [Parameter(Mandatory = $true)][string]$Name,
  [Parameter(Mandatory = $true)][string]$Value,
  [switch]$Sensitive
)
$tmp = [IO.Path]::GetTempFileName()
[IO.File]::WriteAllText($tmp, $Value, (New-Object System.Text.UTF8Encoding($false)))
try {
  vercel env rm $Name production --yes 2>$null | Out-Null
  $flag = if ($Sensitive) { "--sensitive" } else { "--no-sensitive" }
  cmd /c "vercel env add $Name production --force $flag < `"$tmp`""
} finally {
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue
}
