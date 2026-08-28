# Publish the local coins.db to the remote mirror.
#
#   $env:NUMISCAN_HOST = "numiscan@1.2.3.4"      # once per shell, or pass -RemoteHost
#   .\deploy\push-db.ps1
#
# Needs: OpenSSH client (built into Windows 10/11), Node (for the snapshot).
# The remote `numiscan` user needs passwordless sudo for systemctl stop/start
# numiscan  (see deploy/README.md, "Push the local DB").

param(
  [string]$RemoteHost = $env:NUMISCAN_HOST,
  [string]$RemotePath = "/opt/numiscan",
  [switch]$KeepSnapshot
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

if (-not $RemoteHost) {
  throw "Set -RemoteHost user@server  (or `$env:NUMISCAN_HOST)"
}

# Prefer Windows' native OpenSSH: the Git-for-Windows ssh/scp mangle POSIX-looking
# arguments (":/opt/..." -> "C:/Program Files/Git/opt/...").
$sysSsh = Join-Path $env:SystemRoot "System32\OpenSSH\ssh.exe"
$sysScp = Join-Path $env:SystemRoot "System32\OpenSSH\scp.exe"
$ssh = if (Test-Path $sysSsh) { $sysSsh } else { "ssh" }
$scp = if (Test-Path $sysScp) { $sysScp } else { "scp" }

$snap = Join-Path $env:TEMP "coins-snapshot.db"
if (Test-Path $snap) { Remove-Item $snap -Force }

Write-Host "==> Snapshotting coins.db (consistent + compacted)" -ForegroundColor Cyan
node "deploy/snapshot-db.mjs" $snap
if ($LASTEXITCODE -ne 0) { throw "snapshot failed" }

$mb = "{0:N0}" -f ((Get-Item $snap).Length / 1MB)
Write-Host "==> Snapshot size: $mb MB" -ForegroundColor Cyan

Write-Host "==> Uploading to ${RemoteHost}:${RemotePath}/coins.db.incoming  ($mb MB, -C compresses in transit)" -ForegroundColor Cyan
& $scp -C $snap "${RemoteHost}:${RemotePath}/coins.db.incoming"
if ($LASTEXITCODE -ne 0) { throw "scp failed" }

Write-Host "==> Swapping in on the remote (brief restart)" -ForegroundColor Cyan
& $ssh $RemoteHost "bash ${RemotePath}/deploy/receive-db.sh"
if ($LASTEXITCODE -ne 0) { throw "remote swap failed" }

if (-not $KeepSnapshot) { Remove-Item $snap -Force }
Write-Host "==> Done." -ForegroundColor Green
