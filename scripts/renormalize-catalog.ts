/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * @author Andrii (ATR) Tarasenko
 *
 * One-time cleanup: re-run normalizeCountryName() / normalizeDenomination() over
 * every row's `country` and `denomination` columns. New saves already get
 * canonicalized (src/db.ts); this catches rows saved before a rule existed, or
 * before a spelling variant was added to it.
 *
 * Dry run by default — prints what would change. Pass --apply to write it.
 *   npx tsx scripts/renormalize-catalog.ts
 *   npx tsx scripts/renormalize-catalog.ts --apply
 */

import sqlite3 from "sqlite3";
import path from "path";
import { normalizeCountryName } from "../src/utils/normalizeCountryName.js";
import { normalizeDenomination } from "../src/utils/normalizeDenomination.js";

const DB_PATH = path.join(process.cwd(), "coins.db");
const apply = process.argv.includes("--apply");

const db = new sqlite3.Database(DB_PATH);
const all = <T = any>(sql: string): Promise<T[]> =>
  new Promise((res, rej) => db.all(sql, (err, rows) => (err ? rej(err) : res(rows as T[]))));
const run = (sql: string, params: any[]): Promise<void> =>
  new Promise((res, rej) => db.run(sql, params, (err) => (err ? rej(err) : res())));

(async () => {
  const rows = await all<{ id: string; country: string; denomination: string; year: string; title: string }>(
    "SELECT id, country, denomination, year, title FROM coins"
  );

  const changes = rows
    .map((r) => ({
      ...r,
      nextCountry: normalizeCountryName(r.country, r.year),
      nextDenomination: normalizeDenomination(r.denomination),
    }))
    .filter((r) => r.nextCountry !== (r.country || "") || r.nextDenomination !== (r.denomination || ""));

  if (changes.length === 0) {
    console.log(`Checked ${rows.length} coins — country and denomination are already canonical.`);
    db.close();
    return;
  }

  console.log(`${apply ? "Applying" : "Would change"} ${changes.length} of ${rows.length} coins:\n`);
  for (const c of changes) {
    console.log(`  ${c.title}  [${c.id}]`);
    if (c.nextCountry !== (c.country || "")) console.log(`    country:      "${c.country}"  ->  "${c.nextCountry}"`);
    if (c.nextDenomination !== (c.denomination || "")) console.log(`    denomination: "${c.denomination}"  ->  "${c.nextDenomination}"`);
  }

  if (apply) {
    for (const c of changes) {
      await run("UPDATE coins SET country = ?, denomination = ? WHERE id = ?", [c.nextCountry, c.nextDenomination, c.id]);
    }
    console.log(`\nUpdated ${changes.length} rows.`);
  } else {
    console.log(`\nDry run only — re-run with --apply to write these changes.`);
  }
  db.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
