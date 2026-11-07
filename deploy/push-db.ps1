# Publish the local coins.db (+ its image files) to the remote mirror.
#
#   $env:NUMISCAN_HOST = "numiscan@1.2.3.4"      # once per shell, or pass -RemoteHost
#   .\deploy\push-db.ps1                         # add -Prune to delete unreferenced images remotely
#
# Order matters: images first, DB last. The server refuses the DB swap if any image it
# references is missing (receive-db.sh), so the live site never points at absent files.
# Image names are content hashes, so only files the server does not have yet are sent.
#
# Needs: OpenSSH client + tar (both built into Windows 10/11), Node (for the snapshot).
# The remote user needs passwordless sudo for systemctl stop/start numiscan
# (see deploy/README.md, "Push the local DB").

param(
  [string]$RemoteHost = $env:NUMISCAN_HOST,
  [string]$RemotePath = "/opt/numiscan",
  [int]$BatchMB = 200,
  [switch]$Prune,
  [switch]$KeepSnapshot
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

if (-not $RemoteHost) {
  throw "Set -RemoteHost user@server  (or `$env:NUMISCAN_HOST)"
}

# Prefer Windows' native OpenSSH/tar: the Git-for-Windows ssh/scp mangle POSIX-looking
# arguments (":/opt/..." -> "C:/Program Files/Git/opt/..."), and GNU tar from Git does
# not understand C:\ paths.
$sys = Join-Path $env:SystemRoot "System32"
$ssh = if (Test-Path "$sys\OpenSSH\ssh.exe") { "$sys\OpenSSH\ssh.exe" } else { "ssh" }
$scp = if (Test-Path "$sys\OpenSSH\scp.exe") { "$sys\OpenSSH\scp.exe" } else { "scp" }
$tar = if (Test-Path "$sys\tar.exe") { "$sys\tar.exe" } else { "tar" }

$imagesDir = Join-Path $root "images"
$snap = Join-Path $env:TEMP "coins-snapshot.db"
if (Test-Path $snap) { Remove-Item $snap -Force }

Write-Host "==> Snapshotting coins.db (consistent + compacted)" -ForegroundColor Cyan
node "deploy/snapshot-db.mjs" $snap
if ($LASTEXITCODE -ne 0) { throw "snapshot failed" }
$mb = "{0:N1}" -f ((Get-Item $snap).Length / 1MB)
Write-Host "==> Snapshot size: $mb MB" -ForegroundColor Cyan

# ── images ────────────────────────────────────────────────────────────────────
$refs = @(node "deploy/image-refs.mjs" list $snap | Where-Object { $_ })
if ($LASTEXITCODE -ne 0) { throw "could not list image refs" }

if ($refs.Count -gt 0) {
  node "deploy/image-refs.mjs" check $snap $imagesDir
  if ($LASTEXITCODE -ne 0) { throw "local images missing - fix that before publishing" }

  Write-Host "==> Comparing $($refs.Count) image files with the server" -ForegroundColor Cyan
  $remoteList = @(& $ssh $RemoteHost "mkdir -p '$RemotePath/images' && ls -1 '$RemotePath/images'")
  if ($LASTEXITCODE -ne 0) { throw "could not list remote images" }
  $have = New-Object 'System.Collections.Generic.HashSet[string]'
  foreach ($n in $remoteList) { [void]$have.Add($n.Trim()) }
  $missing = @($refs | Where-Object { -not $have.Contains($_) })

  if ($missing.Count -eq 0) {
    Write-Host "    server already has all images" -ForegroundColor DarkGray
  } else {
    # split into ~$BatchMB tarballs so an interrupted first upload resumes where it stopped
    $batches = @(); $cur = @(); $curBytes = 0; $total = 0
    foreach ($n in $missing) {
      $len = (Get-Item (Join-Path $imagesDir $n)).Length
      if ($cur.Count -gt 0 -and ($curBytes + $len) -gt ($BatchMB * 1MB)) { $batches += ,$cur; $cur = @(); $curBytes = 0 }
      $cur += $n; $curBytes += $len; $total += $len
    }
    if ($cur.Count -gt 0) { $batches += ,$cur }
    Write-Host ("==> Uploading {0} new images ({1:N0} MB) in {2} batch(es)" -f $missing.Count, ($total / 1MB), $batches.Count) -ForegroundColor Cyan

    $listFile = Join-Path $env:TEMP "numiscan-images.lst"
    $tarFile  = Join-Path $env:TEMP "numiscan-images.tar"
    $i = 0
    foreach ($b in $batches) {
      $i++
      # LF-only, no BOM: bsdtar reads the names literally
      [IO.File]::WriteAllText($listFile, (($b -join "`n") + "`n"), (New-Object Text.UTF8Encoding $false))
      if (Test-Path $tarFile) { Remove-Item $tarFile -Force }
      & $tar -cf $tarFile -C $imagesDir -T $listFile
      if ($LASTEXITCODE -ne 0) { throw "tar failed" }
      Write-Host ("    [{0}/{1}] {2} files, {3:N0} MB" -f $i, $batches.Count, $b.Count, ((Get-Item $tarFile).Length / 1MB))
      & $scp $tarFile "${RemoteHost}:${RemotePath}/images-incoming.tar"
      if ($LASTEXITCODE -ne 0) { throw "scp of image batch $i failed - re-run to resume" }
      # unpack aside, then move in: a broken tar never leaves a truncated file under a real name
      & $ssh $RemoteHost "cd '$RemotePath' && rm -rf images/.incoming && mkdir -p images/.incoming && tar -xf images-incoming.tar -C images/.incoming && find images/.incoming -maxdepth 1 -type f -exec mv -n -t images/ {} + && rm -rf images/.incoming images-incoming.tar"
      if ($LASTEXITCODE -ne 0) { throw "unpacking image batch $i on the server failed - re-run to resume" }
    }
    Remove-Item $listFile, $tarFile -Force -ErrorAction SilentlyContinue
  }
}

# ── database ──────────────────────────────────────────────────────────────────
Write-Host "==> Uploading DB to ${RemoteHost}:${RemotePath}/coins.db.incoming  ($mb MB)" -ForegroundColor Cyan
& $scp -C $snap "${RemoteHost}:${RemotePath}/coins.db.incoming"
if ($LASTEXITCODE -ne 0) { throw "scp failed" }

Write-Host "==> Swapping in on the remote (brief restart)" -ForegroundColor Cyan
$pruneArg = if ($Prune) { " --prune" } else { "" }
& $ssh $RemoteHost "bash ${RemotePath}/deploy/receive-db.sh$pruneArg"
if ($LASTEXITCODE -ne 0) { throw "remote swap failed" }

if (-not $KeepSnapshot) { Remove-Item $snap -Force }
Write-Host "==> Done." -ForegroundColor Green
