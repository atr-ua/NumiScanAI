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

echo "==> build (vite + esbuild bundle)"
npm run build

echo "==> restart service"
sudo systemctl restart numiscan
sleep 1
sudo systemctl --no-pager --full status numiscan | head -n 12

echo
echo "==> live logs:  journalctl -u numiscan -f"
