#!/usr/bin/env bash
# Swap in a freshly uploaded coins.db.incoming. Invoked over SSH by push-db.ps1.
#   ssh numiscan@server 'bash /opt/numiscan/deploy/receive-db.sh'
set -euo pipefail

cd "$(dirname "$0")/.."
INCOMING=coins.db.incoming
[ -f "$INCOMING" ] || { echo "no $INCOMING here ($(pwd))"; exit 1; }

# sanity check: must be a real sqlite db with a populated coins table
node -e "
const s=require('sqlite3');
const d=new s.Database('$INCOMING');
d.get('SELECT count(*) n FROM coins',(e,r)=>{
  if(e){console.error('bad db:',e.message);process.exit(1)}
  if(!r||r.n<1){console.error('coins table empty - refusing');process.exit(1)}
  console.log('incoming coins:',r.n);
});
"

mkdir -p backups
ts=$(date +%Y%m%d-%H%M%S)

sudo systemctl stop numiscan
[ -f coins.db ] && cp coins.db "backups/coins-pre-push-$ts.db"
mv "$INCOMING" coins.db
rm -f coins.db-wal coins.db-shm
sudo systemctl start numiscan

# keep only the last 5 pre-push safety copies
ls -1t backups/coins-pre-push-*.db 2>/dev/null | tail -n +6 | xargs -r rm -f
echo "swapped in at $ts (previous saved to backups/coins-pre-push-$ts.db)"
