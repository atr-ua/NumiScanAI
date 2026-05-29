/**
 * SQLite database layer — replaces JSON file storage.
 * Uses the `sqlite3` async package wrapped in Promises.
 */

import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "coins.db");
const LEGACY_JSON = path.join(process.cwd(), "src", "coins-data.json");

// ── helpers ──────────────────────────────────────────────────────────────────

const db = new sqlite3.Database(DB_PATH);

const run = (sql: string, params: any[] = []): Promise<void> =>
  new Promise((res, rej) =>
    db.run(sql, params, (err) => (err ? rej(err) : res()))
  );

const all = <T = any>(sql: string, params: any[] = []): Promise<T[]> =>
  new Promise((res, rej) =>
    db.all(sql, params, (err, rows) => (err ? rej(err) : res(rows as T[])))
  );

const get = <T = any>(sql: string, params: any[] = []): Promise<T | undefined> =>
  new Promise((res, rej) =>
    db.get(sql, params, (err, row) => (err ? rej(err) : res(row as T)))
  );

// ── schema ───────────────────────────────────────────────────────────────────

export const initDb = async (): Promise<void> => {
  await run(`PRAGMA journal_mode=WAL`);

  await run(`
    CREATE TABLE IF NOT EXISTS coins (
      id               TEXT PRIMARY KEY,
      image            TEXT    DEFAULT '',
      imageObverse     TEXT    DEFAULT '',
      imageReverse     TEXT    DEFAULT '',
      title            TEXT    NOT NULL DEFAULT '',
      denomination     TEXT    DEFAULT '',
      country          TEXT    DEFAULT '',
      year             TEXT    DEFAULT '',
      metal            TEXT    DEFAULT '',
      weight           TEXT    DEFAULT '',
      diameter         TEXT    DEFAULT '',
      estimatedValue   TEXT    DEFAULT '',
      rarity           TEXT    DEFAULT '',
      grade            TEXT    DEFAULT '',
      historicalContext TEXT   DEFAULT '',
      notes            TEXT    DEFAULT '',
      category         INTEGER,
      recognizedAt     TEXT    DEFAULT '',
      createdAt        TEXT    DEFAULT '',
      updatedAt        TEXT    DEFAULT ''
    )
  `);

  // Migrate from legacy JSON on first run
  const { n } = (await get<{ n: number }>("SELECT COUNT(*) as n FROM coins"))!;
  if (n === 0 && fs.existsSync(LEGACY_JSON)) {
    try {
      const coins: any[] = JSON.parse(fs.readFileSync(LEGACY_JSON, "utf-8"));
      for (const c of coins) {
        await coinInsertOrReplace(c);
      }
      console.log(`[DB] Migrated ${coins.length} coins from JSON → SQLite`);
    } catch (e) {
      console.error("[DB] Migration error:", e);
    }
  }
};

// ── coin row ↔ object mapping ─────────────────────────────────────────────

const toRow = (c: any) => ({
  id:               c.id ?? `coin-${Date.now()}`,
  image:            c.image ?? "",
  imageObverse:     c.imageObverse ?? "",
  imageReverse:     c.imageReverse ?? "",
  title:            c.title ?? "",
  denomination:     c.denomination ?? "",
  country:          c.country ?? "",
  year:             String(c.year ?? ""),
  metal:            c.metal ?? "",
  weight:           c.weight ?? "",
  diameter:         c.diameter ?? "",
  estimatedValue:   c.estimatedValue ?? "",
  rarity:           c.rarity ?? "",
  grade:            c.grade ?? "",
  historicalContext: c.historicalContext ?? "",
  notes:            c.notes ?? "",
  category:         c.category ?? null,
  recognizedAt:     c.recognizedAt ?? new Date().toISOString(),
  createdAt:        c.createdAt ?? c.recognizedAt ?? new Date().toISOString(),
  updatedAt:        c.updatedAt ?? new Date().toISOString(),
});

const UPSERT = `
  INSERT INTO coins (
    id, image, imageObverse, imageReverse, title, denomination, country, year,
    metal, weight, diameter, estimatedValue, rarity, grade, historicalContext,
    notes, category, recognizedAt, createdAt, updatedAt
  ) VALUES (
    $id, $image, $imageObverse, $imageReverse, $title, $denomination, $country, $year,
    $metal, $weight, $diameter, $estimatedValue, $rarity, $grade, $historicalContext,
    $notes, $category, $recognizedAt, $createdAt, $updatedAt
  )
  ON CONFLICT(id) DO UPDATE SET
    image=excluded.image, imageObverse=excluded.imageObverse,
    imageReverse=excluded.imageReverse, title=excluded.title,
    denomination=excluded.denomination, country=excluded.country,
    year=excluded.year, metal=excluded.metal, weight=excluded.weight,
    diameter=excluded.diameter, estimatedValue=excluded.estimatedValue,
    rarity=excluded.rarity, grade=excluded.grade,
    historicalContext=excluded.historicalContext, notes=excluded.notes,
    category=excluded.category, updatedAt=excluded.updatedAt
`;

const coinInsertOrReplace = async (c: any): Promise<void> => {
  const r = toRow(c);
  await run(UPSERT, [
    r.id, r.image, r.imageObverse, r.imageReverse, r.title, r.denomination,
    r.country, r.year, r.metal, r.weight, r.diameter, r.estimatedValue,
    r.rarity, r.grade, r.historicalContext, r.notes, r.category,
    r.recognizedAt, r.createdAt, r.updatedAt,
  ]);
};

// ── public API ────────────────────────────────────────────────────────────────

/** Returns all coins — images excluded for fast list rendering. */
export const dbGetCoins = (): Promise<any[]> =>
  all(`
    SELECT id, title, denomination, country, year,
           metal, weight, diameter, estimatedValue, rarity, grade,
           historicalContext, notes, category, recognizedAt, createdAt, updatedAt,
           (CASE WHEN imageObverse != '' OR image != '' THEN 1 ELSE 0 END) as hasObverse,
           (CASE WHEN imageReverse != '' THEN 1 ELSE 0 END) as hasReverse
    FROM coins ORDER BY createdAt DESC, recognizedAt DESC
  `);

/** Returns a single coin with full image data. */
export const dbGetCoin = (id: string): Promise<any> =>
  get("SELECT * FROM coins WHERE id = ?", [id]);

/** Insert or update a coin (full data including images). */
export const dbSaveCoin = async (c: any): Promise<any> => {
  const now = new Date().toISOString();
  if (!c.id) {
    c.id = `coin-${Date.now()}`;
    c.recognizedAt = now;
    c.createdAt = now;
    c.updatedAt = now;
  } else {
    const existing = await dbGetCoin(c.id);
    c.createdAt = existing?.createdAt || existing?.recognizedAt || now;
    c.updatedAt = now;
  }
  await coinInsertOrReplace(c);
  return c;
};

/** Delete a coin by id. */
export const dbDeleteCoin = (id: string): Promise<void> =>
  run("DELETE FROM coins WHERE id = ?", [id]);
