/**
 * Moves coin images out of SQLite into files (see src/imageStore.ts), or back.
 *
 *   npx tsx scripts/migrate-images.ts                    # ./coins.db → ./images
 *   npx tsx scripts/migrate-images.ts --vacuum           # …then shrink coins.db
 *   npx tsx scripts/migrate-images.ts --reverse          # files → inline base64 (rollback)
 *   npx tsx scripts/migrate-images.ts --db other.db --images other-images
 *
 * Stop the app first. Safe to re-run: already-migrated values are skipped. A row is only
 * rewritten after its files are on disk, and the run ends with a full integrity check.
 * @author Andrii (ATR) Tarasenko
 */

import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const DB_PATH = path.resolve(opt("--db") || "coins.db");
if (opt("--images")) process.env.IMAGES_DIR = path.resolve(opt("--images")!);
const REVERSE = args.includes("--reverse");
const VACUUM = args.includes("--vacuum");

// imported after IMAGES_DIR is set (getImagesDir() reads it lazily anyway)
const { storeImage, loadImageDataUrl, isFileRef, refPath, getImagesDir, IMAGE_FIELDS } = await import("../src/imageStore.js");

if (!fs.existsSync(DB_PATH)) { console.error(`no database at ${DB_PATH}`); process.exit(1); }
const db = new sqlite3.Database(DB_PATH);
const run = (sql: string, p: any[] = []) => new Promise<void>((ok, ko) => db.run(sql, p, (e) => (e ? ko(e) : ok())));
const get = <T = any>(sql: string, p: any[] = []) => new Promise<T>((ok, ko) => db.get(sql, p, (e, r) => (e ? ko(e) : ok(r as T))));
const all = <T = any>(sql: string, p: any[] = []) => new Promise<T[]>((ok, ko) => db.all(sql, p, (e, r) => (e ? ko(e) : ok(r as T[]))));

console.log(`DB:     ${DB_PATH}\nImages: ${getImagesDir()}\nMode:   ${REVERSE ? "files → inline (rollback)" : "inline → files"}`);
await run("PRAGMA busy_timeout = 5000");
await run("PRAGMA wal_checkpoint(TRUNCATE)");

const ids = (await all<{ id: string }>("SELECT id FROM coins ORDER BY rowid")).map((r) => r.id);
let changed = 0, done = 0;
const t0 = Date.now();
const BATCH = 50;

for (let i = 0; i < ids.length; i += BATCH) {
  await run("BEGIN");
  try {
    for (const id of ids.slice(i, i + BATCH)) {
      const row = await get<Record<string, string>>(`SELECT ${IMAGE_FIELDS.join(", ")} FROM coins WHERE id = ?`, [id]);
      const next: Record<string, string> = {};
      for (const f of IMAGE_FIELDS) {
        const v = row[f] || "";
        const nv = REVERSE ? (isFileRef(v) ? await loadImageDataUrl(v) : v) : await storeImage(v);
        if (REVERSE && isFileRef(v) && !nv) throw new Error(`coin ${id}.${f}: file for ${v} is missing — aborting`);
        if (nv !== v) next[f] = nv;
      }
      const cols = Object.keys(next);
      if (cols.length) {
        await run(`UPDATE coins SET ${cols.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`, [...cols.map((c) => next[c]), id]);
        changed++;
      }
      done++;
    }
    await run("COMMIT");
  } catch (e) {
    await run("ROLLBACK");
    throw e;
  }
  process.stdout.write(`\r  ${done}/${ids.length} coins, ${changed} rewritten  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
console.log();

// ── integrity check ─────────────────────────────────────────────────────────
const rows = await all<Record<string, string>>(`SELECT id, ${IMAGE_FIELDS.join(", ")} FROM coins`);
let inline = 0, missing = 0;
const names = new Set<string>();
for (const r of rows) for (const f of IMAGE_FIELDS) {
  const v = r[f] || "";
  if (!v) continue;
  if (isFileRef(v)) {
    names.add(path.basename(refPath(v)!));
    if (!fs.existsSync(refPath(v)!)) { missing++; console.error(`  MISSING ${r.id}.${f} → ${v}`); }
  } else inline++;
}
console.log(`check: ${rows.length} coins, ${names.size} distinct files referenced, ${inline} values still inline, ${missing} missing files`);
if (missing) { console.error("INTEGRITY CHECK FAILED"); process.exit(2); }
if (!REVERSE && inline) { console.error("some values are still inline (undecodable?) — check before deploying"); process.exit(3); }

if (VACUUM) {
  console.log("VACUUM (rebuilds the file without the freed image pages)…");
  await run("VACUUM");
  console.log(`coins.db is now ${(fs.statSync(DB_PATH).size / 1048576).toFixed(1)} MB`);
}
db.close();
console.log("done.");
