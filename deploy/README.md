# Deploying NumiScan AI on Ubuntu 22.04

A standalone instance: its own copy of `coins.db`, reached over HTTPS on your own
domain, kept alive by `systemd`, fronted by nginx + Let's Encrypt.

Layout on the server:

```
/opt/numiscan/            # git clone, WorkingDirectory of the service
  ├── dist/               # built by `npm run build` (frontend + server.cjs)
  ├── coins.db            # one-time copy from the Windows box
  ├── .env                # secrets, NODE_ENV=production
  └── deploy/             # this folder
```

---

## 0. Before you start

* An **A / AAAA DNS record** for `numiscan.example.com` pointing at the server IP.
* A sudo-capable login on the server.
* The Windows machine reachable for one file copy (or the file uploaded some other way).

---

## 1. Base system

```bash
sudo apt update && sudo apt -y upgrade

# firewall: SSH + web only
sudo apt -y install ufw
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Node 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt -y install nodejs

# build deps (insurance for the native sqlite3 module), nginx, certbot, sqlite CLI, git
sudo apt -y install build-essential python3 nginx sqlite3 git \
                    certbot python3-certbot-nginx apache2-utils

node -v      # v22.x
```

---

## 2. App user + code

```bash
sudo useradd --system --create-home --home-dir /opt/numiscan --shell /bin/bash numiscan
sudo -u numiscan git clone https://github.com/atr-ua/NumiScanAI.git /opt/numiscan
cd /opt/numiscan
```

Everything below runs **as the `numiscan` user** unless it says `sudo`:
`sudo -iu numiscan`.

> Simpler alternative when one operator owns the box: skip the dedicated user,
> clone `/opt/numiscan` owned by your existing sudo login (e.g. `ubuntu`), and set
> `User=`/`Group=` in the unit to that name. `push-db.ps1` then needs no
> permission juggling. That is how the live `coins.atrua.duckdns.org` runs.

---

## 3. One-time database copy from Windows

The DB stores images as base64 inside SQLite, so the file is large and the WAL is
bloated. Compact it into a single consistent file, then transfer just that.

**On Windows** (PowerShell, in `d:\Work\Node\GemCoin`) — stop the API server first so
there are no writers, then:

```powershell
# needs sqlite3.exe on PATH (https://www.sqlite.org/download.html -> "sqlite-tools")
sqlite3 coins.db "PRAGMA wal_checkpoint(TRUNCATE); VACUUM INTO 'coins-transfer.db';"
```

`coins-transfer.db` will be noticeably smaller than the 1.75 GB live file (dead image
pages are dropped). Copy it to the server:

```powershell
scp .\coins-transfer.db numiscan@SERVER_IP:/opt/numiscan/coins.db
```

No `sqlite3.exe` handy? Alternative: stop the server and copy **all three** files
`coins.db`, `coins.db-wal`, `coins.db-shm` together to `/opt/numiscan/` — the app
folds the WAL in on first start (`PRAGMA wal_checkpoint(TRUNCATE)` in `initDb`).

**On the server** afterwards:

```bash
chown numiscan:numiscan /opt/numiscan/coins.db
```

Starting fresh instead? Skip this section — `initDb()` creates an empty schema on
first run.

---

## 4. Secrets

```bash
cp deploy/.env.production.example .env
nano .env          # paste GEMINI_API_KEY etc.; set APP_URL=https://numiscan.example.com
chmod 600 .env
```

Set **`AUTH_PASSWORD`** to a strong value — it is the login that unlocks AI
recognition, the Services tab and catalog editing. With it empty the site serves
the catalog read-only to everyone (see section 8).

---

## 5. Build

```bash
npm ci                       # .npmrc pins legacy-peer-deps=true (react-simple-maps vs React 19)
npm run build                # vite build  +  esbuild bundle -> dist/server.cjs
```

If `node -e "require('sqlite3')"` fails with `GLIBC_2.xx not found`, the prebuilt
binary is newer than this distro's glibc — rebuild it locally (needs
`build-essential python3`, already installed in step 1):

```bash
npm rebuild sqlite3 --build-from-source
```

Quick smoke test before wiring systemd:

```bash
NODE_ENV=production PORT=3001 node dist/server.cjs
# -> [CoinDetector API] Server running on http://0.0.0.0:3001
curl -s localhost:3001/api/coins | head -c 200 ; echo
# Ctrl-C
```

---

## 6. systemd service

```bash
sudo cp deploy/numiscan.service /etc/systemd/system/
# if `which node` is NOT /usr/bin/node, fix ExecStart:
#   sudoedit /etc/systemd/system/numiscan.service
sudo systemctl daemon-reload
sudo systemctl enable --now numiscan
systemctl status numiscan
journalctl -u numiscan -f
```

The unit sets `WorkingDirectory=/opt/numiscan`, so `dist/` and `coins.db` resolve
correctly (the server uses `process.cwd()` for both).

---

## 7. nginx + HTTPS

```bash
sudo cp deploy/nginx-numiscan.conf /etc/nginx/sites-available/numiscan
sudo sed -i 's/numiscan.example.com/YOUR_DOMAIN/' /etc/nginx/sites-available/numiscan
sudo ln -s /etc/nginx/sites-available/numiscan /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# certificate — certbot edits the vhost, adds :443 and the 80->443 redirect
sudo certbot --nginx -d YOUR_DOMAIN
sudo systemctl reload nginx
```

Open `https://YOUR_DOMAIN`. `certbot.timer` handles renewals.

Key bits already in the vhost: `client_max_body_size 25M` (base64 uploads),
`proxy_read_timeout 300s` + `proxy_buffering off` (slow AI calls, Numista SSE).

---

## 8. Authentication

The app has a built-in single-password gate (`AUTH_PASSWORD` in `.env`):

* **Not logged in** — public catalog browsing, coin cards (read-only), collection
  statistics. No edit / delete buttons, no reorder, no AI panels.
* **Logged in** (the "Вхід" button, top-right) — the ШІ-Розпізнавання and
  Сервіси tabs appear, and cards become editable.
* Every privileged `/api/*` route enforces this server-side, not just the UI.
* `AUTH_PASSWORD` empty ⇒ nobody can unlock those features — the mirror is fully
  read-only. The server logs a warning on start in that case.

The session is a signed `HttpOnly` cookie; no server-side store. Changing
`AUTH_PASSWORD` (or setting `AUTH_SECRET`) invalidates existing sessions.

Optional extra layer: the vhost still has commented `auth_basic` lines if you want
nginx to challenge before the app is even reachable, or restrict by source IP /
put Tailscale / Cloudflare Access in front.

---

## 9. Updates

```bash
sudo -iu numiscan
cd /opt/numiscan
./deploy/deploy.sh          # git pull -> npm ci -> npm run build -> systemctl restart
```

---

## 9b. Push the local DB (local = source of truth)

Workflow: you add/edit coins locally on Windows; the server only *receives* the
database. For this the server must not write to `coins.db` itself — simplest is to
leave **`AUTH_PASSWORD` empty on the server**, so the mirror is read-only for
everyone and nothing there can diverge.

One-time server setup — let the `numiscan` user restart the service without a
password prompt:

```bash
echo 'numiscan ALL=(root) NOPASSWD: /bin/systemctl stop numiscan, /bin/systemctl start numiscan, /bin/systemctl restart numiscan' \
  | sudo tee /etc/sudoers.d/numiscan-systemctl
sudo chmod 440 /etc/sudoers.d/numiscan-systemctl
chmod +x /opt/numiscan/deploy/receive-db.sh
```

Then, from Windows, whenever you want to publish:

```powershell
$env:NUMISCAN_HOST = "numiscan@YOUR_SERVER"   # once per shell
.\deploy\push-db.ps1
```

`push-db.ps1` → `snapshot-db.mjs` makes a consistent `VACUUM INTO` copy → `scp -C`
uploads it to `coins.db.incoming` → `receive-db.sh` validates it, stops the
service, keeps a `backups/coins-pre-push-*.db` rollback copy, swaps the file in,
drops stale `-wal/-shm`, starts the service. Downtime is a few seconds.

Always `deploy.sh` (code) **before** `push-db.ps1` if the schema changed, so both
sides run the same version.

> **Size note:** images are stored as base64 *inside* `coins.db`, so the snapshot
> is basically the full DB (~1.7 GB now) on every push — `VACUUM` can't shrink
> that, it is real data. `scp -C` helps a little. If pushes get painful, move the
> images out of SQLite into a files directory: `coins.db` drops to a few MB and
> you `rsync` the image dir separately (only new files transfer).

---

## 10. Backups

```bash
chmod +x /opt/numiscan/deploy/*.sh
sudo -u numiscan crontab -e
# 20 3 * * * /opt/numiscan/deploy/backup.sh >> /opt/numiscan/backup.log 2>&1
```

`backup.sh` writes a compacted, gzip'd `VACUUM INTO` snapshot to
`/opt/numiscan/backups/` and keeps the last 14. Pull them off-box with `rsync`
periodically.

---

## Gotchas

| Symptom | Cause / fix |
|---|---|
| `npm ci` fails on peer deps | `.npmrc` with `legacy-peer-deps=true` must be present (it is, in the repo). |
| `require('sqlite3')` → `GLIBC_2.38 not found` | Prebuilt binary too new for the distro. `npm rebuild sqlite3 --build-from-source`. |
| `nginx: conflicting server name ... ignored` | Another vhost already claims that name. Use a different (sub)domain; the app doesn't need to own the apex. |
| `push-db.ps1`: scp writes to `C:/Program Files/Git/...` | Running it *through Git Bash* mangles `/opt/...`. Run from a real PowerShell prompt. |
| 413 Request Entity Too Large | `client_max_body_size` in the vhost < 25M, or you added another `location`. |
| Recognition / sync cuts off ~60 s | `proxy_read_timeout` / `proxy_buffering off` missing from the active vhost. |
| Service runs but `dist` 404s | `WorkingDirectory` not `/opt/numiscan`, or `npm run build` not run. |
| First request after restart is slow | Normal — SQLite reconciles the WAL into `coins.db` on startup. |
| Big `coins.db-wal` again | Expected at runtime; folded back on restart. Long-term fix: move images out of SQLite. |
