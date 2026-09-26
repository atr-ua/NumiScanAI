#!/usr/bin/env bash
# Update NumiScan AI in place. Run as the `numiscan` user:
#   cd /opt/numiscan && ./deploy/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."
echo "==> $(pwd)"

echo "==> git pull"
git pull --ff-only

echo "==> npm ci"
npm ci --legacy-peer-deps

# The prebuilt sqlite3 binary can require a newer glibc than the distro ships
# (Ubuntu 22.04: 2.35 vs 2.38). npm ci re-downloads it, so re-check and rebuild.
if ! node -e "require('sqlite3')" >/dev/null 2>&1; then
  echo "==> sqlite3 prebuilt binary does not load - rebuilding from source (a few minutes)"
  npm rebuild sqlite3 --build-from-source
  node -e "require('sqlite3')"
fi

echo "==> build (vite + esbuild bundle)"
npm run build

echo "==> restart service"
sudo systemctl restart numiscan
sleep 1
sudo systemctl --no-pager --full status numiscan | head -n 12

echo
echo "==> live logs:  journalctl -u numiscan -f"
