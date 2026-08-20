/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * @author Andrii (ATR) Tarasenko
 */

/**
 * Historical/defunct-state flags for coins minted under governments that no longer exist.
 * Checked BEFORE the modern ISO-code/emoji lookup in countryUtils.ts, so a coin from
 * "Малайя" gets the 1950–1963 Federation of Malaya flag instead of modern Malaysia's, etc.
 *
 * Every entry here is matched by a country-name substring already distinct from its modern
 * successor state's name in this app's data (unlike the Libya green-flag case in
 * CountryFlag.tsx, none of these need a year range — the AI/user already write a different
 * `country` string for the historical entity than for the modern one).
 *
 * Sources & licenses: see docs/FLAG_ATTRIBUTIONS.md. Most files are Public Domain;
 * malaya.svg (CC BY-SA 2.5) and uar.svg (CC BY-SA 3.0/GFDL) require attribution, given there.
 */

interface HistoricalFlag {
  test: (lower: string) => boolean;
  src: string;
  label: string;
}

// Order matters: more specific matches must precede more general ones (e.g. the various
// Rhodesia/Nyasaland entities before bare "родезія"), same discipline as countryUtils.ts.
const HISTORICAL_FLAGS: HistoricalFlag[] = [
  {
    test: (l) => l.includes("ньясаленд"),
    src: "/flags/historical/rhodesia-nyasaland.svg",
    label: "Федерація Родезії та Ньясаленду (1953–1963)",
  },
  {
    test: (l) => l.includes("південна родез"),
    src: "/flags/historical/southern-rhodesia.svg",
    label: "Південна Родезія (1924–1964)",
  },
  {
    test: (l) => l.includes("родез") || l.includes("rhodesia"),
    src: "/flags/historical/rhodesia-1968.svg",
    label: "Родезія (1968–1979)",
  },
  {
    test: (l) => (l.includes("малай") && !l.includes("малайз")) || l.includes("малая та британське борнео"),
    src: "/flags/historical/malaya.svg",
    label: "Федерація Малайя (1950–1963)",
  },
  {
    test: (l) => l.includes("австрійська імпер"),
    src: "/flags/historical/austrian-empire.svg",
    label: "Австрійська імперія",
  },
  {
    test: (l) => l.includes("австро-угор"),
    src: "/flags/historical/austria-hungary.svg",
    label: "Австро-Угорщина (1867–1918)",
  },
  {
    test: (l) => l.includes("третій рейх") || l.includes("third reich") || l.includes("нацистська нім"),
    src: "/flags/historical/third-reich.svg",
    label: "Третій Рейх (1933–1945)",
  },
  {
    test: (l) => l.includes("німецька імпер") || l.includes("кайзер"),
    src: "/flags/historical/german-empire.svg",
    label: "Німецька імперія (1871–1918)",
  },
  {
    test: (l) => l === "ндр" || l.includes("німецька демократична") || l.includes("ddr") || l.includes("east germ"),
    src: "/flags/historical/east-germany.svg",
    label: "Німецька Демократична Республіка",
  },
  {
    test: (l) => l.includes("срср") || l.includes("ссср") || l.includes("радян") || l.includes("ussr") || l.includes("soviet"),
    src: "/flags/historical/ussr.svg",
    label: "СРСР",
  },
  {
    test: (l) => l.includes("югослав") || l.includes("yugoslav"),
    src: "/flags/historical/yugoslavia-sfry.svg",
    label: "Югославія (СФРЮ, 1946–1992)",
  },
  {
    test: (l) => l.includes("заїр") || l.includes("zaire"),
    src: "/flags/historical/zaire.svg",
    label: "Заїр (1971–1997)",
  },
  {
    test: (l) => l.includes("народна республіка конго"),
    src: "/flags/historical/congo-pr.svg",
    label: "Народна Республіка Конго (1970–1991)",
  },
  {
    test: (l) => l.includes("цейлон") || l.includes("ceylon"),
    src: "/flags/historical/ceylon.svg",
    label: "Цейлон (домініон, 1948–1972)",
  },
  {
    test: (l) => l.includes("монголія (мнр)") || l.includes("монгольська народна республік"),
    src: "/flags/historical/mongolia-mpr.svg",
    label: "Монгольська Народна Республіка",
  },
  {
    test: (l) => l.includes("об'єднана арабська республіка") || l.includes("оар") || l.includes("united arab republic"),
    src: "/flags/historical/uar.svg",
    label: "Об'єднана Арабська Республіка (1958–1971)",
  },
  {
    test: (l) => (l.includes("нагірн") && l.includes("карабах")) || l.includes("арцах") || l.includes("artsakh"),
    src: "/flags/historical/artsakh.svg",
    label: "Нагірно-Карабаська Республіка (Арцах)",
  },
  {
    test: (l) => l.includes("сомалілен") || l.includes("somaliland"),
    src: "/flags/historical/somaliland.svg",
    label: "Сомаліленд",
  },
];

/** Returns a historical flag asset for defunct states, or null if the country has no such override. */
export function getHistoricalFlagAsset(country: string): { src: string; label: string } | null {
  const lower = (country || "").toLowerCase().trim();
  if (!lower) return null;
  const found = HISTORICAL_FLAGS.find((f) => f.test(lower));
  return found ? { src: found.src, label: found.label } : null;
}
