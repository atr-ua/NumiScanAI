/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * @author Andrii (ATR) Tarasenko
 *
 * Fuzzy matching for duplicate detection. AI recognition text drifts between
 * runs/models — "50 пфенігів" vs "50 пфенінгів", "Німеччина" vs "Німеччина
 * (ФРН)" — so an exact-string duplicate check silently misses coins already
 * in the catalog. These helpers power a *soft* "схоже на" warning; the hard
 * "можливий дубль" flag in App.tsx still requires an exact match, so two
 * legitimately-owned identical coins are never auto-merged.
 */

/** Splits "50 пфенігів" into { amount: 50, unit: "пфенігів" }. */
export function parseDenomination(denomination: string): { amount: number | null; unit: string } {
  const raw = (denomination || "").trim().toLowerCase();
  const match = raw.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!match) return { amount: null, unit: raw };
  return { amount: parseFloat(match[1].replace(",", ".")), unit: match[2].trim() };
}

/** Levenshtein-distance similarity in [0, 1]; 1 = identical strings. */
export function textSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[i], dp[i - 1]);
      prev = tmp;
    }
  }
  return 1 - dp[m] / Math.max(m, n);
}

/** Same coin unit despite spelling drift: amount must match exactly, unit text may differ slightly. */
export function looseDenominationMatch(a: string, b: string): boolean {
  const pa = parseDenomination(a);
  const pb = parseDenomination(b);
  if (pa.amount !== pb.amount) return false;
  if (!pa.unit || !pb.unit) return pa.unit === pb.unit;
  return pa.unit === pb.unit || textSimilarity(pa.unit, pb.unit) >= 0.75;
}

/** "Німеччина (ФРН)" -> { base: "німеччина", qualifier: "фрн" }; no parens -> qualifier "". */
function splitCountryQualifier(country: string): { base: string; qualifier: string } {
  const raw = (country || "").trim().toLowerCase();
  const match = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return match ? { base: match[1].trim(), qualifier: match[2].trim() } : { base: raw, qualifier: "" };
}

/**
 * Same country, or one side is an unqualified legacy spelling of the other's
 * era ("Німеччина" vs "Німеччина (ФРН)"). Two DIFFERENT qualifiers never match
 * ("Німеччина (ФРН)" vs "Німеччина (НДР)" stay distinct).
 */
export function looseCountryMatch(a: string, b: string): boolean {
  const A = splitCountryQualifier(a);
  const B = splitCountryQualifier(b);
  if (A.base !== B.base) return false;
  return !A.qualifier || !B.qualifier || A.qualifier === B.qualifier;
}
