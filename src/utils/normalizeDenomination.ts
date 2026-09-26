/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * @author Andrii (ATR) Tarasenko
 *
 * Collapses recognition-run spelling drift in the denomination's unit name onto one
 * canonical spelling, applied at save time (dbSaveCoin) — same idea as
 * normalizeCountryName.ts, seeded by the same kind of audit: group this catalog's
 * denomination strings by amount and diff the unit text.
 *
 * That audit split real drift from coincidental look-alikes that are actually
 * DIFFERENT currencies and must stay untouched — e.g. Chinese "фен" vs German
 * "пфен-", or Slovenian "толар" vs "долар". Only the unit text (after the leading
 * number) is touched; the amount and Ukrainian grammatical number (крона/крони/крон)
 * are never rewritten into each other.
 */

// Homoglyph cleanup: a Latin "i" typed/OCR'd where Ukrainian needs Cyrillic "і"
// (e.g. "піастрiв" instead of "піастрів" — invisible in most fonts).
const LATIN_I_BETWEEN_CYRILLIC = /(?<=[а-яіїєґ])i(?=[а-яіїєґ]|$)/g;

// Stem fixes that must survive across grammatical inflections (singular/plural/genitive) —
// applied as substring replacements so one rule covers "пфенніг", "пфенніги", "пфеннігів".
const STEM_FIXES: [RegExp, string][] = [
  [/райхс/g, "рейхс"],          // "Reich" transliteration райх- -> рейх- (matches "Третій Рейх" elsewhere in the app)
  [/пфенніг/g, "пфеніг"],       // doubled "н" typo
  [/філлер/g, "філер"],         // doubled "л" typo (Hungarian fillér)
  [/геллер/g, "гелер"],         // doubled "л" typo (Austro-Hungarian heller)
  [/чентезімо/g, "чентезимо"],  // и/і vowel variant (Italian centesimo)
  [/сантім/g, "сантим"],        // и/і vowel variant (French centime)
];

// Whole-unit corrections: short words (unsafe as a substring rule) or irregular endings.
const EXACT_FIXES: Record<string, string> = {
  "пайз": "пайса",                 // Indian/Pakistani paisa
  "кроун": "крона",                // English "Crown" -> the established Ukrainian "крона"
  "оре": "ере",                    // Scandinavian øre/öre
  "йоре": "ере",
  "сентимос": "сентимо",           // Spanish céntimo stays grammatically invariant in this catalog
  "рейхспфеніга": "рейхспфеніги",  // stray genitive-singular ending on a count-2 coin
};

/**
 * Returns the canonical spelling for a denomination string, or the original UNCHANGED
 * (same spacing, same case) when none of the rules above actually apply — including for
 * fraction-style amounts like "1/2 пенні", which have no separating space to begin with.
 * Only ever rewrites the unit text a rule actually touched; never reformats casing or
 * spacing on its own initiative.
 */
export function normalizeDenomination(denomination: string): string {
  const raw = (denomination || "").trim();
  if (!raw) return raw;
  const match = raw.match(/^(\d+(?:[.,]\d+)?)(\s*)(.*)$/);
  if (!match) return raw;
  const [, amount, separator, unitRaw] = match;
  if (!unitRaw) return raw;
  const lower = unitRaw.toLowerCase();

  let fixed = lower.replace(LATIN_I_BETWEEN_CYRILLIC, "і");
  for (const [find, replace] of STEM_FIXES) fixed = fixed.replace(find, replace);
  fixed = EXACT_FIXES[fixed] ?? fixed;

  return fixed === lower ? raw : `${amount}${separator}${fixed}`;
}
