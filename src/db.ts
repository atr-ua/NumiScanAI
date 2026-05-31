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
      mintage          TEXT    DEFAULT '',
      thickness        TEXT    DEFAULT '',
      edge             TEXT    DEFAULT '',
      rarity           TEXT    DEFAULT '',
      grade            TEXT    DEFAULT '',
      historicalContext TEXT   DEFAULT '',
      notes            TEXT    DEFAULT '',
      category         INTEGER,
      vis_id           INTEGER DEFAULT 0,
      recognizedAt     TEXT    DEFAULT '',
      createdAt        TEXT    DEFAULT '',
      updatedAt        TEXT    DEFAULT ''
    )
  `);

  // Migrations for existing databases
  try { await run(`ALTER TABLE coins ADD COLUMN vis_id INTEGER DEFAULT 0`); } catch (_) {}
  try { await run(`ALTER TABLE coins ADD COLUMN mintage TEXT DEFAULT ''`); } catch (_) {}
  try { await run(`ALTER TABLE coins ADD COLUMN thickness TEXT DEFAULT ''`); } catch (_) {}
  try { await run(`ALTER TABLE coins ADD COLUMN edge TEXT DEFAULT ''`); } catch (_) {}

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
  mintage:          c.mintage ?? "",
  thickness:        c.thickness ?? "",
  edge:             c.edge ?? "",
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
    metal, weight, diameter, estimatedValue, mintage, thickness, edge, rarity, grade, historicalContext,
    notes, category, recognizedAt, createdAt, updatedAt
  ) VALUES (
    $id, $image, $imageObverse, $imageReverse, $title, $denomination, $country, $year,
    $metal, $weight, $diameter, $estimatedValue, $mintage, $thickness, $edge, $rarity, $grade, $historicalContext,
    $notes, $category, $recognizedAt, $createdAt, $updatedAt
  )
  ON CONFLICT(id) DO UPDATE SET
    image=excluded.image, imageObverse=excluded.imageObverse,
    imageReverse=excluded.imageReverse, title=excluded.title,
    denomination=excluded.denomination, country=excluded.country,
    year=excluded.year, metal=excluded.metal, weight=excluded.weight,
    diameter=excluded.diameter, estimatedValue=excluded.estimatedValue,
    mintage=excluded.mintage, thickness=excluded.thickness, edge=excluded.edge,
    rarity=excluded.rarity, grade=excluded.grade,
    historicalContext=excluded.historicalContext, notes=excluded.notes,
    category=excluded.category, updatedAt=excluded.updatedAt
`;

const coinInsertOrReplace = async (c: any): Promise<void> => {
  const r = toRow(c);
  await run(UPSERT, [
    r.id, r.image, r.imageObverse, r.imageReverse, r.title, r.denomination,
    r.country, r.year, r.metal, r.weight, r.diameter, r.estimatedValue, r.mintage, r.thickness, r.edge,
    r.rarity, r.grade, r.historicalContext, r.notes, r.category,
    r.recognizedAt, r.createdAt, r.updatedAt,
  ]);
};

// ── public API ────────────────────────────────────────────────────────────────

/** Returns all coins — images excluded for fast list rendering. */
export const dbGetCoins = (): Promise<any[]> =>
  all(`
    SELECT id, title, denomination, country, year,
           metal, weight, diameter, estimatedValue, mintage, thickness, edge, rarity, grade,
           historicalContext, notes, category, vis_id, recognizedAt, createdAt, updatedAt,
           (CASE WHEN imageObverse != '' OR image != '' THEN 1 ELSE 0 END) as hasObverse,
           (CASE WHEN imageReverse != '' THEN 1 ELSE 0 END) as hasReverse
    FROM coins
    ORDER BY CASE WHEN vis_id > 0 THEN vis_id ELSE 0 END ASC, createdAt DESC, recognizedAt DESC
  `);

/** Assigns vis_id 1..N to coins in the given order. */
export const dbReorderCoins = async (ids: string[]): Promise<void> => {
  await run("BEGIN");
  try {
    for (let i = 0; i < ids.length; i++) {
      await run("UPDATE coins SET vis_id = ? WHERE id = ?", [i + 1, ids[i]]);
    }
    await run("COMMIT");
  } catch (e) {
    await run("ROLLBACK");
    throw e;
  }
};

/** Returns lightweight coin list for batch spec updates. */
export const dbGetCoinsForMintage = (): Promise<any[]> =>
  all(`SELECT id, title, country, year, denomination, metal, mintage, thickness, edge, weight, diameter FROM coins ORDER BY country, year`);

/** Updates any combination of spec fields for a single coin. */
export const dbUpdateSpecs = (id: string, specs: {
  mintage?: string; thickness?: string; edge?: string;
  weight?: string; diameter?: string; estimatedValue?: string;
}): Promise<void> => {
  const fields: [string, any][] = [
    ["mintage",        specs.mintage],
    ["thickness",      specs.thickness],
    ["edge",           specs.edge],
    ["weight",         specs.weight],
    ["diameter",       specs.diameter],
    ["estimatedValue", specs.estimatedValue],
  ].filter(([, v]) => v !== undefined) as [string, any][];
  if (!fields.length) return Promise.resolve();
  const sets = fields.map(([f]) => `${f} = ?`);
  const vals = [...fields.map(([, v]) => v), new Date().toISOString(), id];
  return run(`UPDATE coins SET ${sets.join(", ")}, updatedAt = ? WHERE id = ?`, vals);
};

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
