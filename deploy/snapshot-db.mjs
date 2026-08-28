/**
 * Write a consistent, compacted snapshot of coins.db to the path given as argv[2].
 * Uses the project's own sqlite3 module — no sqlite3.exe needed on PATH.
 *   node deploy/snapshot-db.mjs /tmp/coins-snapshot.db
 */
import sqlite3 from "sqlite3";

const out = process.argv[2];
if (!out) {
  console.error("usage: node deploy/snapshot-db.mjs <output-path>");
  process.exit(1);
}

const db = new sqlite3.Database("coins.db");
db.serialize(() => {
  db.run("PRAGMA wal_checkpoint(TRUNCATE)");
  db.run(`VACUUM INTO '${out.replace(/'/g, "''")}'`, (err) => {
    if (err) { console.error(err.message); process.exit(1); }
    db.get("SELECT count(*) n FROM coins", (e, r) => {
      if (!e) console.log(`snapshot ok: ${r.n} coins -> ${out}`);
      db.close();
    });
  });
});
