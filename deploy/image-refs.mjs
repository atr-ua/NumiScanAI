/**
 * Image-file bookkeeping for a coins.db (plain Node, no build step — runs on the server too).
 *
 *   node deploy/image-refs.mjs list  <db>                 # referenced file names, one per line
 *   node deploy/image-refs.mjs check <db> <imagesDir>     # exit 1 if any referenced file is missing
 *   node deploy/image-refs.mjs prune <db> <imagesDir> [--apply]
 *        # files in imagesDir no coin references (dry run unless --apply)
 *
 * Refs look like `file:<32 hex>.<ext>` — see src/imageStore.ts.
 * @author Andrii (ATR) Tarasenko
 */
import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";

const REF_RE = /^file:([0-9a-f]{32}\.[a-z0-9]{1,5})$/;
const NAME_RE = /^[0-9a-f]{32}\.[a-z0-9]{1,5}$/;
const [cmd, dbPath, dir] = process.argv.slice(2);
const apply = process.argv.includes("--apply");

const usage = () => { console.error("usage: image-refs.mjs list <db> | check <db> <dir> | prune <db> <dir> [--apply]"); process.exit(64); };
if (!cmd || !dbPath || (cmd !== "list" && !dir)) usage();
if (!fs.existsSync(dbPath)) { console.error(`no database at ${dbPath}`); process.exit(1); }

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
db.all("SELECT image, imageObverse, imageReverse FROM coins", (err, rows) => {
  if (err) { console.error(err.message); process.exit(1); }
  const names = new Set();
  let inline = 0;
  for (const r of rows) for (const v of [r.image, r.imageObverse, r.imageReverse]) {
    if (!v) continue;
    const m = v.match(REF_RE);
    if (m) names.add(m[1]); else inline++;
  }
  db.close();

  if (cmd === "list") {
    process.stdout.write([...names].sort().join("\n") + (names.size ? "\n" : ""));
    if (inline) console.error(`note: ${inline} image values are still inline base64`);
    return;
  }

  if (cmd === "check") {
    const missing = [...names].filter((n) => !fs.existsSync(path.join(dir, n)));
    console.log(`${rows.length} coins, ${names.size} files referenced, ${missing.length} missing`);
    if (missing.length) { missing.slice(0, 20).forEach((n) => console.error(`  missing: ${n}`)); process.exit(1); }
    return;
  }

  if (cmd === "prune") {
    if (!fs.existsSync(dir)) return console.log("no images dir — nothing to prune");
    const orphans = fs.readdirSync(dir).filter((n) => NAME_RE.test(n) && !names.has(n));
    let bytes = 0;
    for (const n of orphans) {
      const p = path.join(dir, n);
      bytes += fs.statSync(p).size;
      if (apply) fs.rmSync(p);
    }
    console.log(`${orphans.length} unreferenced files (${(bytes / 1048576).toFixed(1)} MB) ${apply ? "deleted" : "found — re-run with --apply to delete"}`);
    return;
  }
  usage();
});
