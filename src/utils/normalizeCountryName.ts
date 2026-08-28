/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * @author Andrii (ATR) Tarasenko
 */

/**
 * Collapses the AI's free-form historical-period country names onto one canonical
 * spelling per entity, applied once at save time (dbSaveCoin) so the `country` column
 * stops splintering into new variants on every recognition run — the DB audit that
 * prompted this found "Німецька імперія" / "Німецька імперия" (typo) / "Німецька
 * імперорія" (typo), and six different spellings of "НДР", all for the same period.
 *
 * Rules run in order, first match wins; year (when the AI didn't note the period in the
 * text at all, e.g. a 1938 coin just labelled "Італія") disambiguates the same way the
 * Libya/Kingdom-of-Italy/Third-Reich year fallbacks in CountryFlag.tsx do. Anything
 * unmatched — including plain modern country names — passes through unchanged.
 */

interface CanonRule {
  test: (lower: string, year: number | null) => boolean;
  canonical: string;
}

const CANON_RULES: CanonRule[] = [
  {
    // Королівство Італія (1861–1946): "Італія", "Королівство Італія", "Італія (Королівство)"
    test: (l, y) => l.includes("італ") && !l.includes("республік") && (l.includes("королівств") || (y != null && y >= 1861 && y < 1946)),
    canonical: "Італія (Королівство)",
  },
  {
    // Третій Рейх (1933–1945) — "рейх" саме по собі однозначне, "нім" не обов'язкове
    // (пор. "Третій Рейх" без слова "Німеччина" в даних колекції)
    test: (l, y) => l.includes("рейх") || (l.includes("нім") && y != null && y >= 1933 && y <= 1945),
    canonical: "Німеччина (Третій Рейх)",
  },
  {
    // Німецька імперія / Кайзеррайх (1871–1918) — включно з одруківками "імперия"/"імперорія"
    test: (l, y) => l.includes("нім") && (l.includes("імпер") || l.includes("кайзер") || (y != null && y >= 1871 && y <= 1918)),
    canonical: "Німеччина (Німецька імперія)",
  },
  {
    // НДР / Східна Німеччина (1949–1990)
    test: (l) => l.includes("ндр") || (l.includes("нім") && l.includes("демократ")),
    canonical: "НДР (Німецька Демократична Республіка)",
  },
  {
    // ФРН / Західна Німеччина (1949–1990), включно з перехідним "Банк німецьких земель" (1948–1950)
    test: (l) => l.includes("фрн") || (l.includes("федератив") && l.includes("нім")) || l.includes("банк німецьких земель"),
    canonical: "Німеччина (ФРН)",
  },
  {
    // Цейлон (домініон, 1948–1972) — без глоси на кшталт "(Шрі-Ланка)"/"(нині Шрі-Ланка)"
    test: (l) => l.includes("цейлон"),
    canonical: "Цейлон",
  },
  {
    // Нагірно-Карабаська Республіка (Арцах)
    test: (l) => (l.includes("нагірн") && l.includes("караба")) || l.includes("арцах") || l.includes("artsakh"),
    canonical: "Нагірно-Карабаська Республіка (Арцах)",
  },
];

/** Returns the canonical spelling for a historical-period country name, or the original string unchanged. */
export function normalizeCountryName(country: string, year?: string | number | null): string {
  const raw = (country || "").trim();
  if (!raw) return raw;
  const lower = raw.toLowerCase();
  const parsedYear = typeof year === "number" ? year : parseInt(String(year ?? ""), 10);
  const y = Number.isFinite(parsedYear) ? parsedYear : null;
  const rule = CANON_RULES.find((r) => r.test(lower, y));
  return rule ? rule.canonical : raw;
}
