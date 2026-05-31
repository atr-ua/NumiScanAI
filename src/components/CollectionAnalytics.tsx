/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * @author Andrii (ATR) Tarasenko
 */

import React, { useState } from "react";
import { Coin } from "../types";
import { BarChart3, Download, Trophy, Globe, Coins, Calendar, TrendingUp, History, Tag, ShieldCheck, Award } from "lucide-react";
import { getCountryFlag } from "../utils/countryUtils";
import CountryFlag from "./CountryFlag";
import WorldMap from "./WorldMap";
import { CATEGORY_COLORS, CATEGORY_NAMES, getCategoryColor, getCategoryName } from "../utils/categoryUtils";

interface CollectionAnalyticsProps {
  coins: Coin[];
  onFilterByCountry?: (country: string) => void;
}

export default function CollectionAnalytics({ coins, onFilterByCountry }: CollectionAnalyticsProps) {
  const [timelineTab, setTimelineTab] = useState<"days" | "months" | "years">("days");

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
      .map(([name, count]) => ({
        name,
        count,
        flag: getCountryFlag(name),
        percentage: coins.length > 0 ? (count / coins.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  };

  const countries = getCountryStats();

  // 5. Timeline Stats by Days, Months, Years
  const getTimelineData = () => {
    const daily: { [key: string]: number } = {};
    const monthly: { [key: string]: number } = {};
    const yearly: { [key: string]: number } = {};

    coins.forEach((coin) => {
      // Prioritize createdAt timestamp, fallback to recognizedAt or a default value
      const rawDateStr = coin.createdAt || coin.recognizedAt;
      let dateObj = new Date();
      if (rawDateStr) {
        const parsed = Date.parse(rawDateStr);
        if (!isNaN(parsed)) {
          dateObj = new Date(parsed);
        }
      }

      // Formatting Day
      const dayKey = dateObj.toLocaleDateString("uk-UA", {
        day: "numeric",
        month: "short",
      });

      // Formatting Month
      const monthKey = dateObj.toLocaleDateString("uk-UA", {
        month: "long",
        year: "numeric",
      });

      // Formatting Year
      const yearKey = dateObj.getFullYear().toString();

      daily[dayKey] = (daily[dayKey] || 0) + 1;
      monthly[monthKey] = (monthly[monthKey] || 0) + 1;
      yearly[yearKey] = (yearly[yearKey] || 0) + 1;
    });

    const formatRegistry = (registry: { [key: string]: number }) => {
      return Object.entries(registry).map(([label, count]) => ({
        label,
        count,
      }));
    };

    return {
      days: formatRegistry(daily).slice(-7), // Last 7 days with additions
      months: formatRegistry(monthly).slice(-6), // Last 6 months with additions
      years: formatRegistry(yearly).slice(-5), // Last 5 years with additions
    };
  };

  const timelineData = getTimelineData();
  const activeTimeline = timelineData[timelineTab];
  const maxTimelineCount = activeTimeline.reduce((max, item) => (item.count > max ? item.count : max), 1);

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
            <WorldMap coins={coins} />
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

                {/* SVG Rendered Premium Interactive Bar-Line Charts */}
                <div className="pt-2">
                  {activeTimeline.length === 0 ? (
                    <p className="text-xs text-white/30 italic py-8 text-center">Записів за вказаний період поки немає</p>
                  ) : (
                    <div className="space-y-6">
                      <div className="h-48 flex items-end justify-between gap-2.5 sm:gap-4 px-2 pt-6">
                        {activeTimeline.map((item, index) => {
                          const heightPct = Math.round((item.count / maxTimelineCount) * 100);
                          return (
                            <div key={index} className="flex-1 flex flex-col items-center h-full justify-end group">
                              <span className="text-[10px] font-mono font-semibold text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity mb-1 select-none">
                                {item.count} шт
                              </span>
                              <div className="w-full bg-white/5 border border-white/5 hover:border-[#D4AF37]/20 rounded-t-lg transition-all duration-300 relative overflow-hidden flex items-end min-h-[4px]" style={{ height: `${heightPct}%` }}>
                                <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-t from-[#D4AF37]/20 to-[#D4AF37]/50 group-hover:from-emerald-400/20 group-hover:to-emerald-400/40 transition-colors duration-300"></div>
                              </div>
                              <span className="text-[9px] font-mono text-white/40 mt-2 truncate w-full text-center group-hover:text-white transition-colors">
                                {item.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-[10px] text-white/35 font-mono text-center leading-relaxed">
                        • Візуалізація показує інтенсивність розширення вашого альбому
                      </div>
                    </div>
                  )}
                </div>
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
                          <CountryFlag country={c.name} className="w-6 h-4.5 object-cover rounded shadow-[0_1px_3px_rgba(0,0,0,0.5)] block shrink-0 border border-white/5" fallbackSizeClass="text-base" />
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
                          <CountryFlag country={c.name} className="w-4 h-3 object-cover rounded shrink-0 border border-white/5" fallbackSizeClass="text-xs" />
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
