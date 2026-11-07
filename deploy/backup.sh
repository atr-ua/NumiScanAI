#!/usr/bin/env bash
# Consistent online backup of coins.db (safe while the service is running).
# Add to the numiscan user's crontab, e.g. daily at 03:20:
#   20 3 * * * /opt/numiscan/deploy/backup.sh >> /opt/numiscan/backup.log 2>&1
set -euo pipefail

APP_DIR=/opt/numiscan
DEST=/opt/numiscan/backups
KEEP=14                         # how many daily snapshots to retain

mkdir -p "$DEST"
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="$DEST/coins-$STAMP.db"

# .backup is a live, page-consistent copy; VACUUM INTO also compacts dead image pages.
sqlite3 "$APP_DIR/coins.db" "VACUUM INTO '$OUT';"
gzip -f "$OUT"
echo "$(date -Is) wrote ${OUT}.gz ($(du -h "${OUT}.gz" | cut -f1))"

# rotate
ls -1t "$DEST"/coins-*.db.gz | tail -n +$((KEEP + 1)) | xargs -r rm -f

# Images are immutable, content-named files: keep a never-shrinking mirror as hard links
# (no extra disk space, survives `receive-db.sh --prune`), so every kept DB snapshot
# above can still be restored together with its pictures.
if [ -d "$APP_DIR/images" ]; then
  mkdir -p "$DEST/images"
  find "$APP_DIR/images" -maxdepth 1 -type f -name '*.*' -exec cp -n -l -t "$DEST/images/" {} +
  echo "$(date -Is) images mirror: $(ls -1 "$DEST/images" | wc -l) files"
fi
