/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * @author Andrii (ATR) Tarasenko
 */

import React, { useState } from "react";
import { Coin } from "../types";
import { BarChart3, Download, Trophy, Globe, Coins, Calendar, TrendingUp, History, Tag, ShieldCheck, Award } from "lucide-react";
import { getCountryFlag, getCountryIsoCode, CONTINENTS } from "../utils/countryUtils";
import CountryFlag from "./CountryFlag";
import WorldMap from "./WorldMap";
import { CATEGORY_COLORS, CATEGORY_NAMES, getCategoryColor, getCategoryName } from "../utils/categoryUtils";

interface CollectionAnalyticsProps {
  coins: Coin[];
  onFilterByCountry?: (country: string) => void;
}

export default function CollectionAnalytics({ coins, onFilterByCountry }: CollectionAnalyticsProps) {
  const [timelineTab, setTimelineTab] = useState<"days" | "months" | "years">("days");
  const [growthIdx, setGrowthIdx] = useState<number | null>(null);

  // 1. Portfolio valuations estimation
  const calculateTotalValuation = () => {
    let minTotal = 0;
    let maxTotal = 0;

    coins.forEach((coin) => {
      const valText = coin.estimatedValue || "";
      const cleanedText = valText.replace(/\s+/g, "");
      const numbers = cleanedText.match(/\d+/g);

      if (numbers && numbers.length >= 2) {
        minTotal += parseFloat(numbers[0]);
        maxTotal += parseFloat(numbers[1]);
      } else if (numbers && numbers.length === 1) {
        const singleVal = parseFloat(numbers[0]);
        if (valText.toLowerCase().includes("грн") || valText.toLowerCase().includes("uah") || singleVal > 10) {
          minTotal += singleVal;
          maxTotal += singleVal;
        }
      }
    });

    return { min: minTotal, max: maxTotal };
  };

  const valuation = calculateTotalValuation();

  // 2. Decade Statistics Calculation
  const getDecadeStats = () => {
    const registry: { [key: string]: number } = {};
    coins.forEach((coin) => {
      let yearNum = NaN;
      if (coin.year) {
        const match = String(coin.year).match(/\d{4}/);
        if (match) yearNum = parseInt(match[0], 10);
      }

      if (isNaN(yearNum) || yearNum < 100) {
        // Fallback for ancient/empty coins
        registry["Античність / Інші"] = (registry["Античність / Інші"] || 0) + 1;
      } else {
        const startDecade = Math.floor(yearNum / 10) * 10;
        let label = `${startDecade}-ті роки`;
        if (startDecade >= 2000) {
          label = `${startDecade}-ні роки`;
        } else if (startDecade < 1800) {
          label = `XVIII ст. чи раніше`;
        }
        registry[label] = (registry[label] || 0) + 1;
      }
    });

    return Object.entries(registry)
      .map(([name, count]) => ({
        name,
        count,
        percentage: coins.length > 0 ? (count / coins.length) * 100 : 0,
      }))
      .sort((a, b) => {
        // Sort of ancient/other towards bottom, sort decades numerically if possible
        if (a.name.includes("раніше") || a.name.includes("Античність")) return 1;
        if (b.name.includes("раніше") || b.name.includes("Античність")) return -1;
        return b.name.localeCompare(a.name);
      });
  };

  const decades = getDecadeStats();

  // 3. Metal stats
  const getMetalStats = () => {
    const registry: { [key: string]: number } = {};
    coins.forEach((c) => {
      const metal = c.metal || "Інше";
      let group = "Інші сплави";
      if (metal.toLowerCase().includes("срібл") || metal.toLowerCase().includes("silver")) {
        group = "Срібло";
      } else if (metal.toLowerCase().includes("золот") || metal.toLowerCase().includes("gold")) {
        group = "Золото";
      } else if (metal.toLowerCase().includes("нейзиль") || metal.toLowerCase().includes("melchior")) {
        group = "Нейзильбер";
      } else if (metal.toLowerCase().includes("мід") || metal.toLowerCase().includes("copper") || metal.toLowerCase().includes("бронз") || metal.toLowerCase().includes("bronze")) {
        group = "Мідь / Бронза";
      } else if (metal.toLowerCase().includes("сталь") || metal.toLowerCase().includes("steel") || metal.toLowerCase().includes("заліз")) {
        group = "Сталь / Залізо";
      } else if (metal.toLowerCase().includes("алюмін")) {
        group = "Алюміній";
      } else if (metal && metal.trim() !== "") {
        group = metal;
      }
      registry[group] = (registry[group] || 0) + 1;
    });

    return Object.entries(registry)
      .map(([name, count]) => ({
        name,
        count,
        percentage: coins.length > 0 ? (count / coins.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  };

  const metals = getMetalStats();

  // 4. Country stats mapped to flags
  const getCountryStats = () => {
    const registry: { [key: string]: number } = {};
    coins.forEach((c) => {
      const country = c.country || "Невідомо";
      registry[country] = (registry[country] || 0) + 1;
    });

    return Object.entries(registry)
      .map(([name, count]) => {
        const firstCoin = coins.find((c) => (c.country || "Невідомо") === name);
        const representativeYear = firstCoin?.year ? Number(firstCoin.year) : null;
        return {
          name,
          count,
          year: representativeYear,
          flag: getCountryFlag(name),
          percentage: coins.length > 0 ? (count / coins.length) * 100 : 0,
        };
      })
      .sort((a, b) => b.count - a.count);
  };

  const countries = getCountryStats();

  // 4b. Continent completion — % of each continent's countries present in the collection
  const getContinentStats = () => {
    const collectedIsoCodes = new Set<string>();
    coins.forEach((c) => {
      const code = getCountryIsoCode(c.country || "");
      if (code) collectedIsoCodes.add(code);
    });

    return CONTINENTS.map((continent) => {
      const collected = continent.codes.filter((code) => collectedIsoCodes.has(code)).length;
      return {
        name: continent.name,
        collected,
        total: continent.codes.length,
        percentage: (collected / continent.codes.length) * 100,
      };
    }).sort((a, b) => b.percentage - a.percentage);
  };

  const continentStats = getContinentStats();

  // 5. Timeline stats — chronological, gap-filled (last 14 days / 12 months / up to 6 years)
  const getTimelineData = () => {
    const dayCounts = new Map<number, number>();
    let datelessCount = 0;
    let earliestDay = Infinity;

    coins.forEach((coin) => {
      const raw = coin.createdAt || coin.recognizedAt;
      const parsed = raw ? Date.parse(raw) : NaN;
      if (isNaN(parsed)) {
        datelessCount++;
        return;
      }
      const d = new Date(parsed);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      dayCounts.set(dayStart, (dayCounts.get(dayStart) || 0) + 1);
      if (dayStart < earliestDay) earliestDay = dayStart;
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Continuous periods → items with count and running collection size
    const buildSeries = (periods: { start: Date; end: Date; label: string }[]) => {
      const counts = periods.map((p) => {
        let c = 0;
        dayCounts.forEach((n, day) => {
          if (day >= p.start.getTime() && day < p.end.getTime()) c += n;
        });
        return c;
      });
      const inWindow = counts.reduce((s, c) => s + c, 0);
      let cumulative = coins.length - inWindow;
      return periods.map((p, i) => {
        cumulative += counts[i];
        return { label: p.label, count: counts[i], cumulative };
      });
    };

    const dayPeriods = Array.from({ length: 14 }, (_, i) => {
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 13 + i);
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 12 + i);
      return { start, end, label: start.toLocaleDateString("uk-UA", { day: "numeric", month: "short" }) };
    });

    const monthPeriods = Array.from({ length: 12 }, (_, i) => {
      const start = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1);
      const end = new Date(today.getFullYear(), today.getMonth() - 10 + i, 1);
      const shortMonth = start.toLocaleDateString("uk-UA", { month: "short" }).replace(".", "");
      return { start, end, label: `${shortMonth} ’${String(start.getFullYear()).slice(-2)}` };
    });

    const currentYear = today.getFullYear();
    const firstYear = earliestDay === Infinity ? currentYear : new Date(earliestDay).getFullYear();
    const startYear = Math.max(firstYear, currentYear - 5);
    const yearPeriods = Array.from({ length: currentYear - startYear + 1 }, (_, i) => ({
      start: new Date(startYear + i, 0, 1),
      end: new Date(startYear + i + 1, 0, 1),
      label: String(startYear + i),
    }));

    // Daily cumulative series across the whole collecting history
    const growth: { time: number; total: number; added: number }[] = [];
    if (earliestDay !== Infinity) {
      let running = datelessCount;
      const cursor = new Date(earliestDay);
      while (cursor.getTime() <= today.getTime()) {
        const t = cursor.getTime();
        const added = dayCounts.get(t) || 0;
        running += added;
        growth.push({ time: t, total: running, added });
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    // Fun facts: record day, average pace, streaks (DST-safe day-step via Date arithmetic)
    const prevDayTime = (t: number) => {
      const d = new Date(t);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1).getTime();
    };
    let record: { time: number; count: number } | null = null;
    dayCounts.forEach((c, t) => {
      if (!record || c > record.count) record = { time: t, count: c };
    });
    let bestStreak = 0;
    let run = 0;
    [...dayCounts.keys()].sort((a, b) => a - b).forEach((t) => {
      run = dayCounts.has(prevDayTime(t)) ? run + 1 : 1;
      if (run > bestStreak) bestStreak = run;
    });
    let currentStreak = 0;
    let cursor = dayCounts.has(today.getTime()) ? today.getTime() : prevDayTime(today.getTime());
    while (dayCounts.has(cursor)) {
      currentStreak++;
      cursor = prevDayTime(cursor);
    }
    const daysSpan = earliestDay === Infinity ? 1 : growth.length;
    const avgPerDay = coins.length / daysSpan;

    return {
      days: buildSeries(dayPeriods),
      months: buildSeries(monthPeriods),
      years: buildSeries(yearPeriods),
      growth,
      stats: { record, bestStreak, currentStreak, avgPerDay, firstTime: earliestDay === Infinity ? null : earliestDay },
    };
  };

  const timelineData = getTimelineData();
  const activeTimeline = timelineData[timelineTab];
  const activeWindowTotal = activeTimeline.reduce((sum, item) => sum + item.count, 0);
  const activeWindowLabel =
    timelineTab === "days"
      ? "останні 14 днів"
      : timelineTab === "months"
        ? "останні 12 місяців"
        : activeTimeline.length > 1
          ? `${activeTimeline[0].label}–${activeTimeline[activeTimeline.length - 1].label}`
          : `${activeTimeline[0]?.label ?? ""} рік`;
  const maxTimelineCount = activeTimeline.reduce((max, item) => (item.count > max ? item.count : max), 1);

  // Growth area chart geometry (viewBox units; stroke kept crisp via vector-effect)
  const growth = timelineData.growth;
  const growthMax = growth.length > 0 ? growth[growth.length - 1].total : 0;
  const GROWTH_W = 600;
  const GROWTH_H = 140;
  const growthPts = growth.map((g, i) => ({
    x: growth.length > 1 ? (i / (growth.length - 1)) * GROWTH_W : 0,
    y: GROWTH_H - (growthMax > 0 ? (g.total / growthMax) * (GROWTH_H - 12) : 0),
  }));
  const growthLine = growthPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const growthArea = growth.length > 1 ? `${growthLine} L${GROWTH_W},${GROWTH_H} L0,${GROWTH_H} Z` : "";

  const handleGrowthMove = (clientX: number, el: HTMLElement) => {
    if (growth.length < 2) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setGrowthIdx(Math.round(ratio * (growth.length - 1)));
  };

  // 6. Category stats
  const getCategoryStats = () => {
    const registry: { [key: number]: number } = {};
    let uncategorized = 0;
    coins.forEach((c) => {
      if (c.category !== undefined) registry[c.category] = (registry[c.category] || 0) + 1;
      else uncategorized++;
    });
    return { byCategory: registry, uncategorized };
  };
  const categoryStats = getCategoryStats();

  // 7. Rarity stats
  const getRarityStats = () => {
    const order = ["Звичайна", "Нечаста", "Колекційна", "Рідкісна", "Колекційна (невеликий тираж)"];
    const registry: { [key: string]: number } = {};
    coins.forEach((c) => {
      const r = c.rarity || "Невідомо";
      registry[r] = (registry[r] || 0) + 1;
    });
    return Object.entries(registry)
      .map(([name, count]) => ({ name, count, percentage: (count / coins.length) * 100 }))
      .sort((a, b) => {
        const ai = order.indexOf(a.name), bi = order.indexOf(b.name);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
  };
  const rarityStats = getRarityStats();

  // 8. Grade stats
  const getGradeStats = () => {
    const order = ["UNC", "AU", "XF", "VF", "F", "VG", "G"];
    const registry: { [key: string]: number } = {};
    coins.forEach((c) => {
      const g = c.grade || "—";
      registry[g] = (registry[g] || 0) + 1;
    });
    return Object.entries(registry)
      .map(([name, count]) => ({ name, count, percentage: (count / coins.length) * 100 }))
      .sort((a, b) => {
        const ai = order.indexOf(a.name), bi = order.indexOf(b.name);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
  };
  const gradeStats = getGradeStats();

  // 9. Fun physical stats
  const parseNum = (s?: string) => {
    if (!s) return 0;
    const m = s.replace(",", ".").match(/[\d.]+/);
    return m ? parseFloat(m[0]) : 0;
  };
  const totalWeightG = coins.reduce((sum, c) => sum + parseNum(c.weight), 0);
  const totalDiameterMm = coins.reduce((sum, c) => sum + parseNum(c.diameter), 0);
  const totalThicknessMm = coins.reduce((sum, c) => sum + parseNum(c.thickness), 0);
  const coinsWithWeight = coins.filter((c) => parseNum(c.weight) > 0).length;
  const coinsWithDiameter = coins.filter((c) => parseNum(c.diameter) > 0).length;
  const coinsWithThickness = coins.filter((c) => parseNum(c.thickness) > 0).length;

  const formatWeight = (g: number) =>
    g >= 1000 ? `${(g / 1000).toFixed(2)} кг` : `${g.toFixed(1)} г`;

  const formatLength = (mm: number) => {
    if (mm >= 1000) return `${(mm / 1000).toFixed(2)} м`;
    if (mm >= 100) return `${(mm / 10).toFixed(1)} см`;
    return `${mm.toFixed(0)} мм`;
  };

  // Backup file actions
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(coins, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `numis_catalog_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    const headers = ["ID", "Title", "Denomination", "Country", "Year", "Metal", "Weight", "Diameter", "Estimated Value", "Rarity", "Grade", "Notes", "Created At", "Updated At", "Recognized At"];
    const rows = coins.map((c) => [
      c.id,
      `"${(c.title || "").replace(/"/g, '""')}"`,
      `"${(c.denomination || "").replace(/"/g, '""')}"`,
      `"${(c.country || "").replace(/"/g, '""')}"`,
      c.year || "",
      `"${(c.metal || "").replace(/"/g, '""')}"`,
      c.weight || "",
      c.diameter || "",
      `"${(c.estimatedValue || "").replace(/"/g, '""')}"`,
      c.rarity || "",
      c.grade || "",
      `"${(c.notes || "").replace(/"/g, '""')}"`,
      c.createdAt || c.recognizedAt || "",
      c.updatedAt || c.recognizedAt || "",
      c.recognizedAt || "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `numis_catalog_export_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="bg-[#121214] border border-white/5 rounded-3xl shadow-2xl overflow-hidden" id="analytics-panel">
      {/* Header */}
      <div className="border-b border-white/5 p-6 bg-black/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl border border-[#D4AF37]/20">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white font-sans tracking-tight animate-fade-in">
                Статистика та Аналітика Колекції
              </h2>
              <p className="text-sm text-white/40 mt-1 font-sans">
                Удосконалений модуль відстеження структури металів, хронології та географії походження
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={coins.length === 0}
              onClick={handleExportJSON}
              className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              title="Експорт в JSON"
            >
              <Download className="h-3.5 w-3.5 text-[#D4AF37]" /> JSON
            </button>
            <button
              type="button"
              disabled={coins.length === 0}
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              title="Експорт в CSV (Microsoft Excel)"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" /> Excel
            </button>
          </div>
        </div>
      </div>

      {coins.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-center text-white/40">
          <Trophy className="h-12 w-12 text-white/10 animate-pulse" />
          <h3 className="text-md font-semibold text-white/80">Статистика ще не сформована</h3>
          <p className="text-xs text-white/40 max-w-sm leading-relaxed">
            Будь ласка, завантажте та додайте щонайменше одну монету до вашого каталогу, щоб візуалізувати аналітику.
          </p>
        </div>
      ) : (
        <div className="p-6 space-y-8">
          {/* World map */}
          <div className="bg-black/20 border border-white/5 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-mono font-medium uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
              <Globe className="h-4 w-4" /> Географія колекції
            </h3>
            <WorldMap
              coins={coins}
              onCountryClick={onFilterByCountry ? (code) => onFilterByCountry(`iso:${code}`) : undefined}
            />

            {/* Continent completion */}
            <div className="pt-3 border-t border-white/5 space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Заповнення по континентах</span>
                <span className="text-[10px] font-mono text-white/25">країн у колекції / всього країн</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                {continentStats.map((ct) => (
                  <div key={ct.name} className="space-y-1">
                    <div className="flex justify-between items-baseline text-xs gap-2">
                      <span className="text-white/80 font-sans truncate">{ct.name}</span>
                      <span className="text-white/50 font-mono text-[11px] shrink-0">
                        {ct.collected} / {ct.total} · <span className="text-[#D4AF37] font-bold">{Math.round(ct.percentage)}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${ct.percentage}%` }}
                        className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F2D06B] rounded-full"
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Real-time stats widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-black/30 border border-white/5 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[120px]">
              <div>
                <span className="text-white/40 text-[10px] uppercase font-mono tracking-wider block">
                  Загальна оціночна вартість
                </span>
                <span className="text-2xl font-serif text-[#D4AF37] font-bold mt-2 inline-block">
                  {valuation.min > 0 ? (
                    `${valuation.min.toLocaleString()} — ${valuation.max.toLocaleString()} UAH`
                  ) : (
                    "Відсутня"
                  )}
                </span>
              </div>
              <p className="text-[10px] text-white/35 mt-2 leading-tight">
                * Розраховано за даними аукціонних ринків.
              </p>
            </div>

            <div className="bg-black/30 border border-white/5 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[120px]">
              <div>
                <span className="text-white/40 text-[10px] uppercase font-mono tracking-wider block">
                  Кількість предметів у базі
                </span>
                <span className="text-2xl font-serif text-white font-bold mt-2 inline-block">
                  {coins.length} шт.
                </span>
              </div>
              <p className="text-[10px] text-white/35 mt-2 leading-tight">
                Усі монети успішно збережено в резервній базі.
              </p>
            </div>

            <div className="bg-black/30 border border-white/5 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[120px]">
              <div>
                <span className="text-white/40 text-[10px] uppercase font-mono tracking-wider block">
                  Різноманітність країн
                </span>
                <span className="text-2xl font-serif text-emerald-400 font-bold mt-2 inline-block">
                  {new Set(coins.map((c) => c.country || "Невідомо")).size} регіонів
                </span>
              </div>
              <p className="text-[10px] text-white/35 mt-2 leading-tight">
                Охоплення вашої світової нумізматичної колекції.
              </p>
            </div>
          </div>

          {/* Fun physical stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-black/30 border border-[#D4AF37]/10 p-5 rounded-2xl flex flex-col justify-between min-h-[110px]">
              <div>
                <span className="text-white/40 text-[10px] uppercase font-mono tracking-wider block">
                  ⚖️ Загальна вага колекції
                </span>
                <span className="text-2xl font-serif text-[#D4AF37] font-bold mt-2 inline-block">
                  {coinsWithWeight > 0 ? formatWeight(totalWeightG) : "—"}
                </span>
              </div>
              <p className="text-[10px] text-white/35 mt-2 leading-tight">
                {coinsWithWeight > 0
                  ? `За даними ${coinsWithWeight} з ${coins.length} монет · решта без ваги`
                  : "Жодна монета не має даних про вагу"}
              </p>
            </div>

            <div className="bg-black/30 border border-[#D4AF37]/10 p-5 rounded-2xl flex flex-col justify-between min-h-[110px]">
              <div>
                <span className="text-white/40 text-[10px] uppercase font-mono tracking-wider block">
                  📐 Товщина стопки монет
                </span>
                <span className="text-2xl font-serif text-white font-bold mt-2 inline-block">
                  {coinsWithThickness > 0 ? formatLength(totalThicknessMm) : "—"}
                </span>
              </div>
              <p className="text-[10px] text-white/35 mt-2 leading-tight">
                {coinsWithThickness > 0
                  ? `Висота стопки з ${coinsWithThickness} монет`
                  : "Жодна монета не має даних про товщину"}
              </p>
            </div>

            <div className="bg-black/30 border border-[#D4AF37]/10 p-5 rounded-2xl flex flex-col justify-between min-h-[110px]">
              <div>
                <span className="text-white/40 text-[10px] uppercase font-mono tracking-wider block">
                  📏 Довжина монет в ряд
                </span>
                <span className="text-2xl font-serif text-white font-bold mt-2 inline-block">
                  {coinsWithDiameter > 0 ? formatLength(totalDiameterMm) : "—"}
                </span>
              </div>
              <p className="text-[10px] text-white/35 mt-2 leading-tight">
                {coinsWithDiameter > 0
                  ? `Якби скласти ${coinsWithDiameter} монет в один ряд за діаметром`
                  : "Жодна монета не має даних про діаметр"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Decade statistics columns & Metals */}
            <div className="lg:col-span-4 space-y-6">
              {/* Decades block */}
              <div className="bg-black/20 border border-white/5 p-5 rounded-2xl space-y-3.5">
                <h3 className="text-white font-medium text-xs font-mono uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
                  <History className="h-4 w-4" /> Статистика за десятиліттями
                </h3>
                <div className="space-y-3 pt-1">
                  {decades.map((d) => (
                    <div key={d.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/80 font-sans">{d.name}</span>
                        <span className="text-white/50 font-mono text-[11px]">
                          {d.count} шт ({Math.round(d.percentage)}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${d.percentage}%` }}
                          className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F2D06B] rounded-full"
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metals block */}
              <div className="bg-black/20 border border-white/5 p-5 rounded-2xl space-y-3.5">
                <h3 className="text-white font-medium text-xs font-mono uppercase tracking-widest text-white/50 flex items-center gap-2">
                  <Coins className="h-4 w-4 text-[#D4AF37]" /> Сплави та метали
                </h3>
                <div className="space-y-3 pt-1">
                  {metals.map((m) => (
                    <div key={m.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/80 font-sans">{m.name}</span>
                        <span className="text-white/50 font-mono text-[11px]">
                          {m.count} шт ({Math.round(m.percentage)}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${m.percentage}%` }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Timeline graphs (By day, month, year) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-black/20 border border-white/5 p-5 rounded-2xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-3">
                  <h3 className="text-white font-medium text-xs font-mono uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" /> Стан інтенсивності додавання монет
                  </h3>

                  {/* Period selection */}
                  <div className="flex bg-[#0A0A0B] p-1 border border-white/5 rounded-xl self-start">
                    <button
                      type="button"
                      onClick={() => setTimelineTab("days")}
                      className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                        timelineTab === "days"
                          ? "bg-[#D4AF37] text-black font-bold"
                          : "text-white/55 hover:text-white"
                      }`}
                    >
                      По днях
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimelineTab("months")}
                      className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                        timelineTab === "months"
                          ? "bg-[#D4AF37] text-black font-bold"
                          : "text-white/55 hover:text-white"
                      }`}
                    >
                      По місяцях
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimelineTab("years")}
                      className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                        timelineTab === "years"
                          ? "bg-[#D4AF37] text-black font-bold"
                          : "text-white/55 hover:text-white"
                      }`}
                    >
                      По роках
                    </button>
                  </div>
                </div>

                {/* Fun-fact chips */}
                {timelineData.stats.firstTime !== null && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-black/30 border border-white/5 rounded-xl p-3">
                      <span className="text-[9px] uppercase font-mono tracking-wider text-white/35 block">🏆 Рекордний день</span>
                      <span className="text-lg font-serif font-bold text-[#D4AF37] block mt-0.5">
                        +{timelineData.stats.record?.count ?? 0} шт
                      </span>
                      <span className="text-[10px] text-white/40 block">
                        {timelineData.stats.record
                          ? new Date(timelineData.stats.record.time).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" })
                          : "—"}
                      </span>
                    </div>
                    <div className="bg-black/30 border border-white/5 rounded-xl p-3">
                      <span className="text-[9px] uppercase font-mono tracking-wider text-white/35 block">⚡ Середній темп</span>
                      <span className="text-lg font-serif font-bold text-white block mt-0.5">
                        {timelineData.stats.avgPerDay.toFixed(1)} шт/день
                      </span>
                      <span className="text-[10px] text-white/40 block">
                        з {new Date(timelineData.stats.firstTime).toLocaleDateString("uk-UA", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <div className="bg-black/30 border border-white/5 rounded-xl p-3">
                      <span className="text-[9px] uppercase font-mono tracking-wider text-white/35 block">🔥 Серія днів поспіль</span>
                      <span className="text-lg font-serif font-bold text-emerald-400 block mt-0.5">
                        {timelineData.stats.currentStreak > 0 ? `${timelineData.stats.currentStreak} дн.` : "—"}
                      </span>
                      <span className="text-[10px] text-white/40 block">
                        {timelineData.stats.currentStreak > 0 ? `зараз триває · рекорд ${timelineData.stats.bestStreak} дн.` : `рекорд — ${timelineData.stats.bestStreak} дн. поспіль`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Additions bar chart */}
                <div className="pt-1">
                  <div className="flex items-baseline justify-between text-[10px] font-mono mb-1">
                    <span className="text-white/35 uppercase tracking-wider">Додано за {activeWindowLabel}</span>
                    <span className={activeWindowTotal > 0 ? "text-emerald-400 font-bold" : "text-white/30"}>
                      {activeWindowTotal > 0 ? `+${activeWindowTotal} шт` : "нічого"}
                    </span>
                  </div>
                  {activeWindowTotal === 0 ? (
                    <p className="text-xs text-white/30 italic py-8 text-center">За {activeWindowLabel} монет не додавалося</p>
                  ) : (
                    <div className="h-44 flex items-end justify-between gap-1.5 sm:gap-2.5 px-1 pt-6">
                      {activeTimeline.map((item, index) => {
                        const heightPct = Math.round((item.count / maxTimelineCount) * 100);
                        return (
                          <div
                            key={index}
                            className="flex-1 flex flex-col items-center h-full justify-end group min-w-0"
                            title={`${item.label}: +${item.count} шт · у колекції ${item.cumulative}`}
                          >
                            <span className="text-[10px] font-mono font-semibold text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity mb-1 select-none whitespace-nowrap">
                              +{item.count}
                            </span>
                            <div
                              className={`w-full rounded-t-lg transition-all duration-300 relative overflow-hidden flex items-end min-h-[3px] ${
                                item.count > 0
                                  ? "bg-white/5 border border-white/5 hover:border-[#D4AF37]/20"
                                  : "bg-white/[0.03]"
                              }`}
                              style={{ height: item.count > 0 ? `${Math.max(heightPct, 4)}%` : undefined }}
                            >
                              {item.count > 0 && (
                                <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-t from-[#D4AF37]/20 to-[#D4AF37]/50 group-hover:from-emerald-400/20 group-hover:to-emerald-400/40 transition-colors duration-300"></div>
                              )}
                            </div>
                            <span className="text-[8px] sm:text-[9px] font-mono text-white/40 mt-2 truncate w-full text-center group-hover:text-white transition-colors">
                              {item.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Cumulative growth area chart */}
                {growth.length > 1 && (
                  <div className="pt-4 border-t border-white/5 space-y-2">
                    <div className="flex items-baseline justify-between text-[10px] font-mono">
                      <span className="text-white/35 uppercase tracking-wider">Зростання колекції</span>
                      <span className="text-white/40">
                        {growth.length} днів · <span className="text-[#D4AF37] font-bold">{growthMax} шт</span>
                      </span>
                    </div>
                    <div
                      className="relative cursor-crosshair select-none"
                      onMouseMove={(e) => handleGrowthMove(e.clientX, e.currentTarget)}
                      onMouseLeave={() => setGrowthIdx(null)}
                      onTouchStart={(e) => handleGrowthMove(e.touches[0].clientX, e.currentTarget)}
                      onTouchMove={(e) => handleGrowthMove(e.touches[0].clientX, e.currentTarget)}
                      onTouchEnd={() => setGrowthIdx(null)}
                    >
                      <svg viewBox={`0 0 ${GROWTH_W} ${GROWTH_H}`} preserveAspectRatio="none" className="w-full h-36 block">
                        <defs>
                          <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.02" />
                          </linearGradient>
                        </defs>
                        <path d={growthArea} fill="url(#growthGradient)" />
                        <path d={growthLine} fill="none" stroke="#D4AF37" strokeWidth={2} vectorEffect="non-scaling-stroke" />
                      </svg>
                      {growthIdx !== null && growth[growthIdx] && (
                        <>
                          <div
                            className="absolute inset-y-0 w-px bg-white/20 pointer-events-none"
                            style={{ left: `${(growthPts[growthIdx].x / GROWTH_W) * 100}%` }}
                          />
                          <div
                            className="absolute w-2.5 h-2.5 rounded-full bg-[#D4AF37] border-2 border-[#121214] pointer-events-none -translate-x-1/2 -translate-y-1/2"
                            style={{
                              left: `${(growthPts[growthIdx].x / GROWTH_W) * 100}%`,
                              top: `${(growthPts[growthIdx].y / GROWTH_H) * 100}%`,
                            }}
                          />
                          <div
                            className="absolute top-1 -translate-x-1/2 pointer-events-none z-10"
                            style={{ left: `${Math.min(86, Math.max(14, (growthPts[growthIdx].x / GROWTH_W) * 100))}%` }}
                          >
                            <div className="bg-[#1B1B1F] border border-white/10 rounded-lg px-2.5 py-1.5 text-center shadow-xl whitespace-nowrap">
                              <div className="text-[10px] text-white/50 font-mono">
                                {new Date(growth[growthIdx].time).toLocaleDateString("uk-UA", { day: "numeric", month: "short", year: "numeric" })}
                              </div>
                              <div className="text-xs font-bold text-[#D4AF37]">{growth[growthIdx].total} шт</div>
                              {growth[growthIdx].added > 0 && (
                                <div className="text-[10px] text-emerald-400 font-mono">+{growth[growthIdx].added} за день</div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-white/30 px-0.5">
                      <span>{new Date(growth[0].time).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}</span>
                      <span>{new Date(growth[Math.floor((growth.length - 1) / 2)].time).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}</span>
                      <span>{new Date(growth[growth.length - 1].time).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Geographic Flag block */}
              <div className="bg-black/20 border border-white/5 p-5 rounded-2xl space-y-3.5">
                <h3 className="text-white font-medium text-xs font-mono uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Країни колекції
                  <span className="ml-auto text-white/25 normal-case tracking-normal font-sans font-normal text-[11px]">{countries.length} регіонів</span>
                </h3>

                {onFilterByCountry && (
                  <p className="text-[10px] text-white/25 italic">Подвійний клік на країні → фільтр у каталозі</p>
                )}

                {/* Top-10 — prominent with progress bar */}
                <div className="space-y-2.5">
                  {countries.slice(0, 10).map((c, i) => (
                    <div
                      key={c.name}
                      className={`space-y-1 rounded-lg px-1 -mx-1 transition-colors ${onFilterByCountry ? "cursor-pointer hover:bg-white/5 active:bg-white/10" : ""}`}
                      onDoubleClick={() => onFilterByCountry?.(c.name)}
                      title={onFilterByCountry ? `Двічі клікніть щоб фільтрувати: ${c.name}` : undefined}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono text-white/20 w-4 shrink-0 text-right">{i + 1}</span>
                          <CountryFlag country={c.name} year={c.year} className="w-6 h-4.5 object-cover rounded shadow-[0_1px_3px_rgba(0,0,0,0.5)] block shrink-0 border border-white/5" fallbackSizeClass="text-base" />
                          <span className="text-xs text-white/80 font-semibold truncate font-sans">{c.name}</span>
                        </div>
                        <span className="text-[#D4AF37] font-mono text-xs font-bold shrink-0">{c.count} шт</span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden ml-6">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#D4AF37]/60 to-[#D4AF37]/30" style={{ width: `${c.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rest — compact grid */}
                {countries.length > 10 && (
                  <div className="pt-2.5 border-t border-white/5 space-y-1.5">
                    <span className="text-[10px] font-mono text-white/25 uppercase tracking-widest">Інші ({countries.length - 10})</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1">
                      {countries.slice(10).map((c) => (
                        <div
                          key={c.name}
                          className={`flex items-center gap-1.5 py-0.5 min-w-0 rounded transition-colors ${onFilterByCountry ? "cursor-pointer hover:bg-white/5" : ""}`}
                          onDoubleClick={() => onFilterByCountry?.(c.name)}
                          title={onFilterByCountry ? `Двічі клікніть щоб фільтрувати: ${c.name}` : undefined}
                        >
                          <CountryFlag country={c.name} year={c.year} className="w-4 h-3 object-cover rounded shrink-0 border border-white/5" fallbackSizeClass="text-xs" />
                          <span className="text-[10px] text-white/40 truncate">{c.name}</span>
                          <span className="text-[10px] font-mono text-white/25 ml-auto shrink-0">{c.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom row: Category + Rarity + Grade */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Category block */}
            <div className="bg-black/20 border border-white/5 p-5 rounded-2xl space-y-3.5">
              <h3 className="text-white font-medium text-xs font-mono uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
                <Tag className="h-4 w-4" /> Категорії колекції
              </h3>
              <div className="space-y-2 pt-1">
                {CATEGORY_NAMES.map((name, i) => {
                  const count = categoryStats.byCategory[i] || 0;
                  const pct = (count / coins.length) * 100;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[i] }} />
                          <span className="text-white/70">{name}</span>
                        </span>
                        <span className="text-white/40 font-mono text-[11px]">{count} шт</span>
                      </div>
                      {count > 0 && (
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[i] }} />
                        </div>
                      )}
                    </div>
                  );
                })}
                {categoryStats.uncategorized > 0 && (
                  <div className="flex justify-between text-xs pt-1 border-t border-white/5">
                    <span className="text-white/30 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-white/15 shrink-0" /> Без категорії
                    </span>
                    <span className="text-white/30 font-mono text-[11px]">{categoryStats.uncategorized} шт</span>
                  </div>
                )}
              </div>
            </div>

            {/* Rarity block */}
            <div className="bg-black/20 border border-white/5 p-5 rounded-2xl space-y-3.5">
              <h3 className="text-white font-medium text-xs font-mono uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Ступінь рідкості
              </h3>
              <div className="space-y-3 pt-1">
                {rarityStats.map((r) => {
                  const color = r.name.includes("Рідкісна") || r.name.includes("Колекційна")
                    ? "#F87171" : r.name === "Нечаста" ? "#FDE047" : "#6EE7B7";
                  return (
                    <div key={r.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/80">{r.name.replace(" (невеликий тираж)", "")}</span>
                        <span className="text-white/50 font-mono text-[11px]">{r.count} шт ({Math.round(r.percentage)}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${r.percentage}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grade block */}
            <div className="bg-black/20 border border-white/5 p-5 rounded-2xl space-y-3.5">
              <h3 className="text-white font-medium text-xs font-mono uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
                <Award className="h-4 w-4" /> Збереженість (Grade)
              </h3>
              <div className="space-y-3 pt-1">
                {gradeStats.map((g) => {
                  const gradeColor: { [k: string]: string } = {
                    UNC: "#D4AF37", AU: "#F2D06B", XF: "#93C5FD", VF: "#6EE7B7", F: "#FDBA74", VG: "#FCA5A5", G: "#FDA4AF"
                  };
                  const color = gradeColor[g.name] || "#888";
                  return (
                    <div key={g.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/80 font-mono font-bold" style={{ color }}>{g.name}</span>
                        <span className="text-white/50 font-mono text-[11px]">{g.count} шт ({Math.round(g.percentage)}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${g.percentage}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
