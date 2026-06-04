/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * @author Andrii (ATR) Tarasenko
 */

import React, { useState, useEffect } from "react";
import { Coin } from "../types";
import { Search, Trash2, Edit2, Calendar, Scale, Coins, ShieldCheck, MapPin, Database, Award, Info, Save, X, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import CountryFlag from "./CountryFlag";
import { CATEGORY_COLORS, CATEGORY_NAMES, getCategoryColor, getCategoryName } from "../utils/categoryUtils";
import { fixTitleWithYear } from "../utils/coinUtils";

type SortPreset = "date" | "country" | "year" | "country_year_denom";

interface CoinDatabaseProps {
  coins: Coin[];
  onDeleteCoin: (id: string) => Promise<void>;
  onUpdateCoin: (coin: Coin) => Promise<void>;
  onReorderCoins: (ids: string[]) => Promise<void>;
  countryFilter?: string;
  onClearCountryFilter?: () => void;
}

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return "невідомо";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "невідомо";
    return d.toLocaleString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "невідомо";
  }
};

export { fixTitleWithYear } from "../utils/coinUtils";

const SORT_PRESETS: { id: SortPreset; label: string }[] = [
  { id: "date",              label: "За датою" },
  { id: "country",          label: "За країною" },
  { id: "year",             label: "За роком" },
  { id: "country_year_denom", label: "Країна + рік + номінал" },
];

const getSortedIds = (coins: Coin[], preset: SortPreset): string[] => {
  const sorted = [...coins];
  switch (preset) {
    case "country":
      sorted.sort((a, b) => (a.country || "").localeCompare(b.country || ""));
      break;
    case "year":
      sorted.sort((a, b) =>
        Number(a.year || 0) - Number(b.year || 0) ||
        (a.country || "").localeCompare(b.country || "")
      );
      break;
    case "country_year_denom":
      sorted.sort((a, b) =>
        (a.country || "").localeCompare(b.country || "") ||
        Number(a.year || 0) - Number(b.year || 0) ||
        (a.denomination || "").localeCompare(b.denomination || "")
      );
      break;
    case "date":
    default:
      sorted.sort((a, b) =>
        new Date(b.createdAt || b.recognizedAt || 0).getTime() -
        new Date(a.createdAt || a.recognizedAt || 0).getTime()
      );
      break;
  }
  return sorted.map((c) => c.id);
};

export default function CoinDatabase({ coins, onDeleteCoin, onUpdateCoin, onReorderCoins, countryFilter, onClearCountryFilter }: CoinDatabaseProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMetalFilter, setSelectedMetalFilter] = useState("Всі");
  const [currentPage, setCurrentPage] = useState(1);
  const [isReordering, setIsReordering] = useState(false);

  const handleApplySort = async (preset: SortPreset) => {
    setIsReordering(true);
    try {
      await onReorderCoins(getSortedIds(coins, preset));
    } finally {
      setIsReordering(false);
    }
  };
  const PAGE_SIZE = 60;
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<{
    src: string; title: string; subtitle?: string;
    coinId?: string; side?: "obverse" | "reverse";
    hasObverse?: boolean; hasReverse?: boolean;
  } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Buffer state to edit details
  const [editForm, setEditForm] = useState<Partial<Coin>>({});
  const detailAbortRef = React.useRef<AbortController | null>(null);
  const filteredCoinsRef = React.useRef<Coin[]>([]);

  const metalToCategory = (metal: string): string => {
    const m = (metal || "").toLowerCase();
    if (m.includes("бімет")) return "Біметал";
    if (m.includes("срібл") || m.includes("silver")) return "Срібло";
    if (m.includes("золот") || m.includes("gold")) return "Золото";
    if (m.includes("сталь") || m.includes("залізо")) return "Сталь";
    if (m.includes("бронза")) return "Бронза";
    if (m.includes("латун")) return "Латунь";
    if (m.includes("мідно-нікел")) return "Купроніккель";
    if (m.includes("мідь") || m.includes("мідн")) return "Мідь";
    if (m.includes("алюмін")) return "Алюміній";
    if (m.includes("нікель")) return "Нікель";
    return "Інше";
  };

  const CATEGORY_ORDER = ["Біметал", "Срібло", "Золото", "Бронза", "Латунь", "Купроніккель", "Сталь", "Мідь", "Алюміній", "Нікель", "Інше"];
  const categoriesInDb = CATEGORY_ORDER.filter((cat) => coins.some((c) => metalToCategory(c.metal) === cat));

  const filteredCoins = coins.filter((coin) => {
    const matchesSearch =
      coin.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coin.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (coin.year?.toString() || "").includes(searchQuery) ||
      coin.metal.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMetal =
      selectedMetalFilter === "Всі" || metalToCategory(coin.metal) === selectedMetalFilter;

    const matchesCountry =
      !countryFilter || coin.country === countryFilter;

    return matchesSearch && matchesMetal && matchesCountry;
  });

  const totalPages = Math.ceil(filteredCoins.length / PAGE_SIZE);
  const paginatedCoins = filteredCoins.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  filteredCoinsRef.current = filteredCoins;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentPage((p) => Math.min(p + 1, totalPages));
        document.getElementById("coin-catalog-panel")?.scrollIntoView({ behavior: "smooth" });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentPage((p) => Math.max(p - 1, 1));
        document.getElementById("coin-catalog-panel")?.scrollIntoView({ behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [totalPages]);

  useEffect(() => {
    if (!zoomedImage) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setZoomedImage(null); return; }
      if (!zoomedImage.coinId || e.ctrlKey) return;
      if (e.key === "ArrowRight" && zoomedImage.side === "obverse" && zoomedImage.hasReverse) {
        e.preventDefault();
        setZoomedImage({ ...zoomedImage, src: `/api/coins/${zoomedImage.coinId}/image/reverse`, subtitle: "Реверс (RV)", side: "reverse" });
      } else if (e.key === "ArrowLeft" && zoomedImage.side === "reverse" && zoomedImage.hasObverse) {
        e.preventDefault();
        setZoomedImage({ ...zoomedImage, src: `/api/coins/${zoomedImage.coinId}/image/obverse`, subtitle: "Аверс (AV)", side: "obverse" });
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const list = filteredCoinsRef.current;
        const idx = list.findIndex((c) => c.id === zoomedImage.coinId);
        const nextIdx = e.key === "ArrowDown" ? idx + 1 : idx - 1;
        if (nextIdx < 0 || nextIdx >= list.length) return;
        const next = list[nextIdx];
        const preferSide = zoomedImage.side ?? "obverse";
        const hasPref = preferSide === "obverse" ? Boolean(next.hasObverse) : Boolean(next.hasReverse);
        const hasAlt  = preferSide === "obverse" ? Boolean(next.hasReverse) : Boolean(next.hasObverse);
        if (!hasPref && !hasAlt) return;
        const side: "obverse" | "reverse" = hasPref ? preferSide : (preferSide === "obverse" ? "reverse" : "obverse");
        setZoomedImage({
          src: `/api/coins/${next.id}/image/${side}`,
          title: next.title,
          subtitle: side === "obverse" ? "Аверс (AV)" : "Реверс (RV)",
          coinId: next.id,
          side,
          hasObverse: Boolean(next.hasObverse),
          hasReverse: Boolean(next.hasReverse),
        });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [zoomedImage]);

  const handleOpenDetail = async (coin: Coin) => {
    detailAbortRef.current?.abort();
    const controller = new AbortController();
    detailAbortRef.current = controller;
    setSelectedCoin(coin);
    setEditForm(coin);
    setIsEditing(false);
    setShowConfirmDelete(false);
    setSaveError(null);
    try {
      const res = await fetch(`/api/coins/${coin.id}`, { signal: controller.signal });
      if (res.ok) {
        const full = await res.json();
        setSelectedCoin(full);
        setEditForm(full);
      }
    } catch {}
  };

  const handleCloseDetail = () => {
    setSelectedCoin(null);
    setShowConfirmDelete(false);
    setSaveError(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedCoin) return;
    detailAbortRef.current?.abort();
    detailAbortRef.current = null;
    setSaveError(null);
    try {
      const year = editForm.year ?? selectedCoin.year;
      const title = editForm.title ?? selectedCoin.title;
      const refinedTitle = year ? fixTitleWithYear(title, year) : title;

      const updated: Coin = {
        ...selectedCoin,
        ...editForm,
        year,
        title: refinedTitle,
        createdAt: selectedCoin.createdAt || selectedCoin.recognizedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Coin;
      await onUpdateCoin(updated);
      setSelectedCoin(updated);
    } catch (err: any) {
      console.error("Помилка збереження монети:", err);
      setSaveError(err?.message || "Помилка збереження");
    } finally {
      setIsEditing(false);
    }
  };

  const handleImageSideChange = (e: React.ChangeEvent<HTMLInputElement>, side: "obverse" | "reverse") => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm((prev) => ({
          ...prev,
          [side === "obverse" ? "imageObverse" : "imageReverse"]: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 flex flex-col gap-6" id="coin-catalog-panel">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white font-sans tracking-tight flex items-center gap-2">
              <Database className="h-5 w-5 text-[#D4AF37]" /> База розпізнаних монет ({filteredCoins.length})
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              Пошук та аналіз монетної колекції вашого репозиторію
            </p>
          </div>
        </div>

        {/* Active country filter banner */}
        {countryFilter && (
          <div className="flex items-center gap-2 px-3 py-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl">
            <span className="text-xs text-[#D4AF37] font-semibold">Фільтр країни:</span>
            <span className="text-xs text-white/80 font-mono">{countryFilter}</span>
            <button
              type="button"
              onClick={onClearCountryFilter}
              className="ml-auto flex items-center gap-1 text-[10px] text-white/40 hover:text-white border border-white/10 hover:border-white/30 rounded-lg px-2 py-0.5 transition-all cursor-pointer"
            >
              <X className="h-3 w-3" /> Очистити
            </button>
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            type="text"
            placeholder="Пошук за назвою, країною, металом чи роком..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-9 py-2.5 bg-black/40 border border-white/10 focus:border-[#D4AF37] focus:bg-black/60 text-sm rounded-xl outline-none transition-all placeholder:text-white/30 text-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-white/40 mr-1">Фільтр сплаву:</span>
          <button
            type="button"
            onClick={() => { setSelectedMetalFilter("Всі"); setCurrentPage(1); }}
            className={`cursor-pointer px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              selectedMetalFilter === "Всі"
                ? "bg-[#D4AF37] border-[#D4AF37] text-[#0A0A0B] font-bold shadow-sm"
                : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            Всі
          </button>
          {categoriesInDb.map((cat) => (
            <button
              type="button"
              key={cat}
              onClick={() => { setSelectedMetalFilter(cat); setCurrentPage(1); }}
              className={`cursor-pointer px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                selectedMetalFilter === cat
                  ? "bg-[#D4AF37] border-[#D4AF37] text-[#0A0A0B] font-bold shadow-sm"
                  : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sort presets */}
        <div className="flex flex-wrap gap-1.5 items-center pt-1">
          <span className="text-xs text-white/40 mr-1">Порядок:</span>
          {SORT_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleApplySort(p.id)}
              disabled={isReordering}
              className="cursor-pointer px-3 py-1 rounded-full text-xs font-medium border transition-all bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isReordering ? "…" : p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List of Coins */}
      {filteredCoins.length === 0 ? (
        <div className="h-44 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2.5 text-white/40 text-center p-6">
          <Coins className="h-8 w-8 text-[#D4AF37]/45" />
          <div>
            <p className="text-sm font-medium text-white/80">Збігів не знайдено</p>
            <p className="text-xs text-white/40 mt-0.5">Будь ласка, змініть параметри фільтра або додайте нові екземпляри</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="album-grid">
          {paginatedCoins.map((coin) => (
            <div
              key={coin.id}
              onClick={() => handleOpenDetail(coin)}
              className="group border border-white/5 hover:border-[#D4AF37]/35 cursor-pointer p-4 rounded-2xl hover:shadow-xl hover:shadow-[#D4AF37]/5 bg-[#1A1A1C] hover:bg-[#202022] transition-all flex flex-col gap-4 text-left justify-between h-full"
            >
              {/* Coin Image Visual Showcase with larger vertical layout */}
              {Boolean(coin.hasObverse && coin.hasReverse) ? (
                <div className="w-full h-44 sm:h-48 flex gap-2.5 items-center justify-between">
                  {/* Obverse side */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomedImage({ src: `/api/coins/${coin.id}/image/obverse`, title: coin.title, subtitle: "Аверс (AV)", coinId: coin.id, side: "obverse", hasObverse: Boolean(coin.hasObverse), hasReverse: Boolean(coin.hasReverse) });
                    }}
                    className="w-1/2 h-full bg-black/45 hover:bg-black/80 border border-white/5 hover:border-[#D4AF37]/35 rounded-xl overflow-hidden flex items-center justify-center relative cursor-zoom-in transition-all"
                  >
                    <img
                      src={`/api/coins/${coin.id}/image/obverse`}
                      alt="Аверс"
                      loading="lazy"
                      className="h-full w-full object-contain p-2 group-hover:scale-[1.08] transition-transform duration-300"
                    />
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/85 text-[8px] font-mono font-bold text-[#D4AF37] border border-[#D4AF37]/20 rounded select-none leading-none scale-[0.85] origin-bottom-right">
                      АВЕРС (AV)
                    </span>
                  </div>
                  {/* Reverse side */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomedImage({ src: `/api/coins/${coin.id}/image/reverse`, title: coin.title, subtitle: "Реверс (RV)", coinId: coin.id, side: "reverse", hasObverse: Boolean(coin.hasObverse), hasReverse: Boolean(coin.hasReverse) });
                    }}
                    className="w-1/2 h-full bg-black/45 hover:bg-black/80 border border-white/5 hover:border-[#D4AF37]/35 rounded-xl overflow-hidden flex items-center justify-center relative cursor-zoom-in transition-all"
                  >
                    <img
                      src={`/api/coins/${coin.id}/image/reverse`}
                      alt="Реверс"
                      loading="lazy"
                      className="h-full w-full object-contain p-2 group-hover:scale-[1.08] transition-transform duration-300"
                    />
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/85 text-[8px] font-mono font-bold text-white/60 border border-white/10 rounded select-none leading-none scale-[0.85] origin-bottom-right">
                      РЕВЕРС (RV)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-44 sm:h-48 bg-black/45 border border-white/5 rounded-xl overflow-hidden flex items-center justify-center relative group-hover:border-[#D4AF37]/20 transition-all">
                  {coin.hasObverse ? (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomedImage({ src: `/api/coins/${coin.id}/image/obverse`, title: coin.title, subtitle: "Аверс (AV)", coinId: coin.id, side: "obverse", hasObverse: Boolean(coin.hasObverse), hasReverse: Boolean(coin.hasReverse) });
                      }}
                      className="w-full h-full flex items-center justify-center cursor-zoom-in relative"
                    >
                      <img
                        src={`/api/coins/${coin.id}/image/obverse`}
                        alt={coin.title}
                        loading="lazy"
                        className="h-full max-w-full object-contain p-2 group-hover:scale-[1.08] transition-transform duration-300"
                      />
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/85 text-[8px] font-mono font-bold text-[#D4AF37] border border-[#D4AF37]/20 rounded select-none leading-none">
                        АВЕРС (AV)
                      </span>
                    </div>
                  ) : coin.hasReverse ? (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomedImage({ src: `/api/coins/${coin.id}/image/reverse`, title: coin.title, subtitle: "Реверс (RV)", coinId: coin.id, side: "reverse", hasObverse: Boolean(coin.hasObverse), hasReverse: Boolean(coin.hasReverse) });
                      }}
                      className="w-full h-full flex items-center justify-center cursor-zoom-in relative"
                    >
                      <img
                        src={`/api/coins/${coin.id}/image/reverse`}
                        alt={coin.title}
                        loading="lazy"
                        className="h-full max-w-full object-contain p-2 group-hover:scale-[1.08] transition-transform duration-300"
                      />
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/85 text-[8px] font-mono font-bold text-white/60 border border-white/10 rounded select-none leading-none">
                        РЕВЕРС (RV)
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 text-[#D4AF37]/45">
                      <Coins className="h-9 w-9 text-[#D4AF37]/35 group-hover:rotate-12 transition-transform duration-300 mb-2" />
                      <span className="text-[10px] font-mono select-none tracking-wide">БЕЗ ЗОБРАЖЕННЯ</span>
                    </div>
                  )}
                </div>
              )}

              {/* Text Specs Summary metadata column */}
              <div className="flex-1 min-w-0 flex flex-col justify-between h-full gap-2.5">
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2 mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-[#D4AF37]/90 uppercase tracking-widest flex items-center gap-1.5 truncate max-w-[170px]">
                      {coin.category !== undefined && (
                        <span
                          className="w-2 h-2 rounded-full shrink-0 inline-block"
                          style={{ backgroundColor: getCategoryColor(coin.category) }}
                          title={getCategoryName(coin.category)}
                        />
                      )}
                      <CountryFlag country={coin.country} className="w-5 h-3.5 object-cover rounded shadow-[0_1px_2px_rgba(0,0,0,0.4)] block shrink-0 border border-white/5" />
                      <span className="truncate">{coin.country}</span>
                    </span>
                    <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full border shrink-0 ${
                      coin.rarity === "Колекційна (невеликий тираж)" || coin.rarity === "Рідкісна" || coin.rarity === "Колекційна"
                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                        : coin.rarity === "Нечаста"
                        ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    }`}>
                      {coin.rarity?.replace(" (невеликий тираж)", "") || "Рядова"}
                    </span>
                  </div>
                  <h3 className="font-sans font-semibold text-white text-xs sm:text-sm group-hover:text-[#D4AF37] transition-all duration-200 line-clamp-2 leading-snug">
                    {coin.title}
                  </h3>
                </div>

                {/* Micro metrics grid */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] font-mono pt-2.5 border-t border-white/5 text-white/45">
                  <div className="truncate">
                    Рік: <span className="text-white/80 font-semibold">{coin.year || "—"}</span>
                  </div>
                  <div className="truncate">
                    Стан: <span className="text-white/80 font-bold">{coin.grade || "VF"}</span>
                  </div>
                  <div className="col-span-2 text-[#D4AF37] font-semibold mt-1 flex justify-between items-center text-xs leading-tight border-b border-white/5 pb-1.5 mb-1">
                    <span>{coin.metal || "Сплав"}</span>
                    <span className="text-white text-xs sm:text-sm font-serif font-semibold">{coin.estimatedValue}</span>
                  </div>
                  <div className="col-span-2 text-[8px] text-white/30 flex justify-between gap-1 leading-tight select-none font-mono">
                    <span>Дод: {formatDateTime(coin.createdAt || coin.recognizedAt)}</span>
                    <span>Змін: {formatDateTime(coin.updatedAt || coin.createdAt || coin.recognizedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/5">
          <span className="text-[10px] text-white/35 font-mono">
            {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredCoins.length)} з {filteredCoins.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => { setCurrentPage(1); document.getElementById("coin-catalog-panel")?.scrollIntoView({ behavior: "smooth" }); }}
              disabled={currentPage === 1}
              className="px-2 py-1 text-[10px] font-mono rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-white/25 disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
            >«</button>
            <button
              type="button"
              onClick={() => { setCurrentPage((p) => p - 1); document.getElementById("coin-catalog-panel")?.scrollIntoView({ behavior: "smooth" }); }}
              disabled={currentPage === 1}
              className="px-2.5 py-1 text-[10px] font-mono rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-white/25 disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
            >‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-1.5 text-white/25 text-[10px] font-mono select-none">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setCurrentPage(p as number); document.getElementById("coin-catalog-panel")?.scrollIntoView({ behavior: "smooth" }); }}
                    className={`min-w-[28px] px-2 py-1 text-[10px] font-mono rounded-lg border transition-all cursor-pointer ${
                      currentPage === p
                        ? "bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#D4AF37] font-bold"
                        : "border-white/10 text-white/40 hover:text-white hover:border-white/25"
                    }`}
                  >{p}</button>
                )
              )}
            <button
              type="button"
              onClick={() => { setCurrentPage((p) => p + 1); document.getElementById("coin-catalog-panel")?.scrollIntoView({ behavior: "smooth" }); }}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 text-[10px] font-mono rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-white/25 disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
            >›</button>
            <button
              type="button"
              onClick={() => { setCurrentPage(totalPages); document.getElementById("coin-catalog-panel")?.scrollIntoView({ behavior: "smooth" }); }}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-[10px] font-mono rounded-lg border border-white/10 text-white/40 hover:text-white hover:border-white/25 disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
            >»</button>
          </div>
        </div>
      )}

      {/* Detail Overlay Card Modal */}
      {selectedCoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121214] rounded-3xl max-w-2xl w-full border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between text-[#E0E0E0]">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-[#D4AF37]" />
                <h3 className="font-sans font-bold text-lg text-white truncate pr-6">
                  {isEditing ? "Редагування відомостей" : "Картка монети"}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseDetail}
                className="p-1 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scroll area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {/* Image & Main stats display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/30 p-5 rounded-2xl border border-white/5">
                {/* Images column (either single main image or side-by-side obverse/reverse) */}
                <div className="flex flex-col gap-2">
                  {(!selectedCoin.imageObverse && !selectedCoin.imageReverse && !isEditing) ? (
                    <div className="h-56 bg-[#1A1A1C] rounded-xl border border-white/10 overflow-hidden flex items-center justify-center shadow-inner relative">
                      {selectedCoin.image ? (
                        <img
                          src={selectedCoin.image}
                          alt={selectedCoin.title}
                          className="h-full object-contain max-w-full cursor-zoom-in hover:scale-[1.03] transition-transform duration-300"
                          onClick={() => setZoomedImage({
                            src: selectedCoin.image,
                            title: selectedCoin.title,
                            subtitle: "Основне фото"
                          })}
                        />
                      ) : (
                        <div className="text-white/45 text-xs flex flex-col items-center gap-2">
                          <Coins className="h-12 w-12 text-[#D4AF37]/45 animate-pulse" />
                          <span className="font-mono text-[10px]">КЕШОВАНЕ ЗОБРАЖЕННЯ</span>
                        </div>
                      )}
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 text-white/50 border border-white/10 text-[9px] font-mono rounded">
                        ГОЛОВНЕ ФОТО
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {/* Obverse box */}
                      <div className="h-44 bg-[#1A1A1C] rounded-xl border border-white/10 overflow-hidden flex flex-col items-center justify-center shadow-inner relative group">
                        {isEditing ? (
                          <label className="absolute inset-x-0 bottom-0 bg-black/75 hover:bg-black/90 p-1.5 text-center text-[10px] text-white/90 cursor-pointer font-sans transition-all z-10 flex items-center justify-center gap-1">
                            <Upload className="h-3 w-3 text-[#D4AF37]" />
                            <span>Завантажити аверс</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageSideChange(e, "obverse")}
                              className="hidden"
                            />
                          </label>
                        ) : null}
                        {(editForm.imageObverse || selectedCoin.imageObverse) ? (
                          <img
                            src={editForm.imageObverse || selectedCoin.imageObverse}
                            alt="Аверс"
                            className={`h-full w-full object-contain p-1 ${!isEditing ? "cursor-zoom-in hover:scale-[1.05] transition-transform duration-300" : ""}`}
                            onClick={() => {
                              if (!isEditing) {
                                setZoomedImage({ src: editForm.imageObverse || selectedCoin.imageObverse!, title: selectedCoin.title, subtitle: "Аверс (AV)", coinId: selectedCoin.id, side: "obverse", hasObverse: !!(editForm.imageObverse || selectedCoin.imageObverse), hasReverse: !!(editForm.imageReverse || selectedCoin.imageReverse) });
                              }
                            }}
                          />
                        ) : (
                          <div className="text-white/30 text-[10px] flex flex-col items-center gap-1.5 p-2 text-center select-none">
                            <Coins className="h-8 w-8 text-white/20" />
                            <span>Аверс відсутній</span>
                          </div>
                        )}
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/80 text-white/50 border border-white/10 text-[8px] font-mono rounded select-none z-10">
                          АВЕРС
                        </span>
                        {isEditing && (editForm.imageObverse || selectedCoin.imageObverse) && (
                          <button
                            type="button"
                            onClick={() => setEditForm((prev) => ({ ...prev, imageObverse: "" }))}
                            className="absolute top-1.5 right-1.5 p-1 bg-red-500/80 hover:bg-red-600 text-white rounded-lg transition-all cursor-pointer z-10"
                            title="Видалити"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {/* Reverse box */}
                      <div className="h-44 bg-[#1A1A1C] rounded-xl border border-white/10 overflow-hidden flex flex-col items-center justify-center shadow-inner relative group">
                        {isEditing ? (
                          <label className="absolute inset-x-0 bottom-0 bg-black/75 hover:bg-black/90 p-1.5 text-center text-[10px] text-white/90 cursor-pointer font-sans transition-all z-10 flex items-center justify-center gap-1">
                            <Upload className="h-3 w-3 text-[#D4AF37]" />
                            <span>Завантажити реверс</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageSideChange(e, "reverse")}
                              className="hidden"
                            />
                          </label>
                        ) : null}
                        {(editForm.imageReverse || selectedCoin.imageReverse) ? (
                          <img
                            src={editForm.imageReverse || selectedCoin.imageReverse}
                            alt="Реверс"
                            className={`h-full w-full object-contain p-1 ${!isEditing ? "cursor-zoom-in hover:scale-[1.05] transition-transform duration-300" : ""}`}
                            onClick={() => {
                              if (!isEditing) {
                                setZoomedImage({ src: editForm.imageReverse || selectedCoin.imageReverse!, title: selectedCoin.title, subtitle: "Реверс (RV)", coinId: selectedCoin.id, side: "reverse", hasObverse: !!(editForm.imageObverse || selectedCoin.imageObverse), hasReverse: !!(editForm.imageReverse || selectedCoin.imageReverse) });
                              }
                            }}
                          />
                        ) : (
                          <div className="text-white/30 text-[10px] flex flex-col items-center gap-1.5 p-2 text-center select-none">
                            <Coins className="h-8 w-8 text-white/20" />
                            <span>Реверс відсутній</span>
                          </div>
                        )}
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/80 text-white/50 border border-white/10 text-[8px] font-mono rounded select-none z-10">
                          РЕВЕРС
                        </span>
                        {isEditing && (editForm.imageReverse || selectedCoin.imageReverse) && (
                          <button
                            type="button"
                            onClick={() => setEditForm((prev) => ({ ...prev, imageReverse: "" }))}
                            className="absolute top-1.5 right-1.5 p-1 bg-red-500/80 hover:bg-red-600 text-white rounded-lg transition-all cursor-pointer z-10"
                            title="Видалити"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {!isEditing && (
                    <div className="flex gap-2 justify-center mt-1">
                      <span className="text-[9px] font-mono text-white/35">
                        {!selectedCoin.imageObverse && !selectedCoin.imageReverse ? (
                          "💡 Натисніть «Редагувати поля» щоб додати аверс і реверс"
                        ) : (
                          "✓ Фото аверсу та реверсу монети завантажені у базу"
                        )}
                      </span>
                    </div>
                  )}

                  <span className="text-[8px] font-mono text-white/20 text-center select-none block">
                    ID: {selectedCoin.id.substring(0, 10)}
                  </span>
                </div>

                <div className="flex flex-col justify-between gap-4">
                  <div>
                    <span className="text-xs text-[#D4AF37] font-mono font-medium uppercase tracking-widest block">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.country || ""}
                          onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                          className="border border-white/10 bg-black/40 text-white rounded px-2 py-0.5 w-full font-mono text-xs scale-95 focus:border-[#D4AF37] focus:outline-none"
                        />
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <CountryFlag country={selectedCoin.country} fallbackSizeClass="text-sm" />
                          {selectedCoin.country}
                        </span>
                      )}
                    </span>
                    <h2 className="text-lg font-sans font-bold text-white tracking-tight mt-1 leading-snug">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.title || ""}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className="border border-white/10 bg-black/40 text-white rounded px-2 py-1 w-full text-xs font-sans focus:border-[#D4AF37] focus:outline-none"
                        />
                      ) : (
                        selectedCoin.title
                      )}
                    </h2>
                  </div>

                  <div className="space-y-2 text-xs text-white/60 border-t border-white/5 pt-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-white/30" />
                      <span>Рік:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.year ?? ""}
                          onChange={(e) => { const v = e.target.value; setEditForm((prev) => ({ ...prev, year: v })); }}
                          className="border border-white/10 bg-black/50 text-white text-xs rounded px-1.5 py-0.5 w-20 font-bold focus:border-[#D4AF37] focus:outline-none"
                        />
                      ) : (
                        <strong className="text-white">{selectedCoin.year}</strong>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-white/30" />
                      <span>Стан збереження:</span>
                      {isEditing ? (
                        <select
                          value={editForm.grade || "VF"}
                          onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                          className="border border-white/10 bg-black/50 text-white text-xs rounded px-1.5 py-0.5 focus:border-[#D4AF37] focus:outline-none"
                        >
                          <option value="UNC">UNC (Абсолютна збереженість)</option>
                          <option value="AU">AU (Майже анциркулейтед)</option>
                          <option value="XF">XF (Відмінний стан)</option>
                          <option value="VF">VF (Дуже хороший стан)</option>
                          <option value="F">F (Хороший стан)</option>
                          <option value="VG">VG (Задовільний стан)</option>
                        </select>
                      ) : (
                        <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/35 font-mono font-bold px-2 py-0.5 rounded text-[10px]">
                          {selectedCoin.grade}
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 text-white/30 mt-0.5 shrink-0" />
                      <div className="flex flex-col gap-1.5 flex-1">
                        <span>Категорія:</span>
                        {isEditing ? (
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditForm({ ...editForm, category: undefined })}
                              className={`px-2 py-0.5 rounded-full text-[10px] border transition-all cursor-pointer ${editForm.category === undefined ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-white/30 hover:border-white/25"}`}
                            >
                              Без категорії
                            </button>
                            {CATEGORY_NAMES.map((name, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setEditForm({ ...editForm, category: i })}
                                className={`px-2 py-0.5 rounded-full text-[10px] border transition-all cursor-pointer font-medium`}
                                style={{
                                  borderColor: editForm.category === i ? CATEGORY_COLORS[i] : 'rgba(255,255,255,0.1)',
                                  backgroundColor: editForm.category === i ? `${CATEGORY_COLORS[i]}22` : 'transparent',
                                  color: editForm.category === i ? CATEGORY_COLORS[i] : 'rgba(255,255,255,0.4)',
                                }}
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        ) : selectedCoin.category !== undefined ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium w-fit"
                            style={{
                              backgroundColor: `${getCategoryColor(selectedCoin.category)}22`,
                              color: getCategoryColor(selectedCoin.category),
                              border: `1px solid ${getCategoryColor(selectedCoin.category)}55`,
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getCategoryColor(selectedCoin.category) }} />
                            {getCategoryName(selectedCoin.category)}
                          </span>
                        ) : (
                          <span className="text-white/30 text-[10px]">Без категорії</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-white/30" />
                      <span>Ринкова вартість:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.estimatedValue || ""}
                          onChange={(e) => setEditForm({ ...editForm, estimatedValue: e.target.value })}
                          className="border border-white/10 bg-black/50 text-white text-xs rounded px-1.5 py-0.5 w-32 focus:border-[#D4AF37] focus:outline-none"
                        />
                      ) : (
                        <strong className="text-[#D4AF37] font-mono text-sm">{selectedCoin.estimatedValue}</strong>
                      )}
                    </div>

                    <div className="flex items-center gap-2 border-t border-white/5 pt-2 mt-2 text-[11px]">
                      <span className="text-white/40">Додано в каталог:</span>
                      <strong className="text-white/70 font-mono">{formatDateTime(selectedCoin.createdAt || selectedCoin.recognizedAt)}</strong>
                    </div>

                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-white/40">Остання зміна:</span>
                      <strong className="text-white/70 font-mono">{formatDateTime(selectedCoin.updatedAt || selectedCoin.createdAt || selectedCoin.recognizedAt)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modular Tech Specifications grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#1A1A1C] p-3 rounded-lg border border-white/5 text-center">
                  <span className="text-[9px] text-[#D4AF37]/40 block font-mono uppercase tracking-wider">НОМІНАЛ</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.denomination || ""}
                      onChange={(e) => setEditForm({ ...editForm, denomination: e.target.value })}
                      className="border border-white/10 bg-black/40 text-white text-xs rounded p-1 w-full text-center mt-1 focus:border-[#D4AF37] focus:outline-none"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-white block mt-1 truncate">{selectedCoin.denomination}</span>
                  )}
                </div>
                <div className="bg-[#1A1A1C] p-3 rounded-lg border border-white/5 text-center">
                  <span className="text-[9px] text-[#D4AF37]/40 block font-mono uppercase tracking-wider">МЕТАЛ</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.metal || ""}
                      onChange={(e) => setEditForm({ ...editForm, metal: e.target.value })}
                      className="border border-white/10 bg-black/40 text-white text-xs rounded p-1 w-full text-center mt-1 focus:border-[#D4AF37] focus:outline-none"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-white block mt-1 truncate">{selectedCoin.metal}</span>
                  )}
                </div>
                <div className="bg-[#1A1A1C] p-3 rounded-lg border border-white/5 text-center">
                  <span className="text-[9px] text-[#D4AF37]/40 block font-mono uppercase tracking-wider">ВАГА (ОЦІНКА)</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.weight || ""}
                      onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                      className="border border-white/10 bg-black/40 text-white text-xs rounded p-1 w-full text-center mt-1 focus:border-[#D4AF37] focus:outline-none"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-white block mt-1 truncate">{selectedCoin.weight || "—"}</span>
                  )}
                </div>
                <div className="bg-[#1A1A1C] p-3 rounded-lg border border-white/5 text-center">
                  <span className="text-[9px] text-[#D4AF37]/40 block font-mono uppercase tracking-wider">ДІАМЕТР (ОЦІНКА)</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.diameter || ""}
                      onChange={(e) => setEditForm({ ...editForm, diameter: e.target.value })}
                      className="border border-white/10 bg-black/40 text-white text-xs rounded p-1 w-full text-center mt-1 focus:border-[#D4AF37] focus:outline-none"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-white block mt-1 truncate">{selectedCoin.diameter || "—"}</span>
                  )}
                </div>
                <div className="bg-[#1A1A1C] p-3 rounded-lg border border-white/5 text-center">
                  <span className="text-[9px] text-[#D4AF37]/40 block font-mono uppercase tracking-wider">ТИРАЖ</span>
                  {isEditing ? (
                    <input type="text" value={editForm.mintage || ""} onChange={(e) => setEditForm({ ...editForm, mintage: e.target.value })}
                      className="border border-white/10 bg-black/40 text-white text-xs rounded p-1 w-full text-center mt-1 focus:border-[#D4AF37] focus:outline-none" />
                  ) : (
                    <span className="text-xs font-semibold text-white block mt-1 truncate">{selectedCoin.mintage || "—"}</span>
                  )}
                </div>
                <div className="bg-[#1A1A1C] p-3 rounded-lg border border-white/5 text-center">
                  <span className="text-[9px] text-[#D4AF37]/40 block font-mono uppercase tracking-wider">ТОВЩИНА</span>
                  {isEditing ? (
                    <input type="text" value={editForm.thickness || ""} onChange={(e) => setEditForm({ ...editForm, thickness: e.target.value })}
                      className="border border-white/10 bg-black/40 text-white text-xs rounded p-1 w-full text-center mt-1 focus:border-[#D4AF37] focus:outline-none" />
                  ) : (
                    <span className="text-xs font-semibold text-white block mt-1 truncate">{selectedCoin.thickness || "—"}</span>
                  )}
                </div>
                <div className="bg-[#1A1A1C] p-3 rounded-lg border border-white/5 text-center">
                  <span className="text-[9px] text-[#D4AF37]/40 block font-mono uppercase tracking-wider">ГУРТ</span>
                  {isEditing ? (
                    <input type="text" value={editForm.edge || ""} onChange={(e) => setEditForm({ ...editForm, edge: e.target.value })}
                      className="border border-white/10 bg-black/40 text-white text-xs rounded p-1 w-full text-center mt-1 focus:border-[#D4AF37] focus:outline-none" />
                  ) : (
                    <span className="text-xs font-semibold text-white block mt-1 truncate">{selectedCoin.edge || "—"}</span>
                  )}
                </div>
              </div>

              {/* Historical Context Textblock */}
              <div className="space-y-1.5 flex flex-col">
                <span className="text-xs font-semibold text-white font-sans flex items-center gap-1">
                  <Info className="h-4 w-4 text-[#D4AF37]/70" /> Нумізматична характеристика та контекст
                </span>
                {isEditing ? (
                  <textarea
                    rows={4}
                    value={editForm.historicalContext || ""}
                    onChange={(e) => setEditForm({ ...editForm, historicalContext: e.target.value })}
                    className="border border-white/10 bg-black/45 text-white text-xs p-3 rounded-xl focus:border-[#D4AF37] focus:outline-none w-full leading-relaxed"
                  />
                ) : (
                  <div className="bg-black/30 p-4 border border-white/5 rounded-2xl max-h-48 overflow-y-auto pr-2">
                    <p className="text-xs text-white/70 leading-relaxed text-justify">
                      {selectedCoin.historicalContext || "Історичний опис відсутній."}
                    </p>
                  </div>
                )}
              </div>

              {/* Custom Collector's notes text block */}
              <div className="space-y-1.5 flex flex-col">
                <span className="text-xs font-semibold text-white/70 font-sans">
                  Власні коментарі колекціонера
                </span>
                <textarea
                  rows={2}
                  placeholder="Додайте ваші замітки, історію покупки, умови збереження тощо..."
                  value={isEditing ? editForm.notes || "" : selectedCoin.notes || ""}
                  disabled={!isEditing}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="border border-white/10 disabled:border-transparent bg-black/40 disabled:bg-black/10 text-white text-xs p-3 rounded-xl focus:border-[#D4AF37] focus:outline-none w-full"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#0D0D0E] border-t border-white/5 flex items-center justify-between gap-3">
              {!showConfirmDelete ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  className="hover:bg-red-500/10 text-red-400 font-sans px-4 py-2 text-xs font-medium rounded-xl flex items-center gap-1.5 border border-transparent hover:border-red-500/20 transition-all outline-none cursor-pointer p-2"
                >
                  <Trash2 className="h-4 w-4" /> Видалити з бази
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-black/40 border border-white/5 py-1 px-3 rounded-xl animate-fade-in">
                  <span className="text-[11px] text-red-400 font-medium">Впевнені?</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await onDeleteCoin(selectedCoin.id);
                      handleCloseDetail();
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white font-sans px-2.5 py-1 text-[11px] font-semibold rounded-lg shadow-lg shadow-red-500/20 transition-all cursor-pointer"
                  >
                    Видалити
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(false)}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 px-2 py-1 text-[11px] font-medium rounded-lg transition-all cursor-pointer"
                  >
                    Скасувати
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap justify-end">
                {saveError && !isEditing && (
                  <span className="text-[11px] text-red-400 font-mono bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg">
                    {saveError}
                  </span>
                )}
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { setIsEditing(false); setSaveError(null); }}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 px-4 py-2 text-xs font-medium rounded-xl transition-all outline-none cursor-pointer"
                    >
                      Відхилити
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 text-xs font-medium rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all outline-none cursor-pointer"
                    >
                      <Save className="h-4 w-4" /> Зберегти зміни
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setIsEditing(true); setSaveError(null); }}
                    className="bg-[#D4AF37] hover:bg-[#c4a030] text-[#0A0A0B] font-bold px-5 py-2 text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-[#D4AF37]/25 transition-all outline-none cursor-pointer"
                  >
                    <Edit2 className="h-4 w-4" /> Редагувати поля
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zoomed Image Viewer Modal Overlay */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl animate-fade-in p-4 sm:p-6"
          onClick={() => setZoomedImage(null)}
        >
          {/* Floating Close Button Top Right */}
          <button
            type="button"
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 rounded-full text-white/80 hover:text-white transition-all cursor-pointer z-[80] shadow-lg"
            title="Закрити (Esc)"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Left nav arrow — reverse → obverse */}
          {zoomedImage.coinId && zoomedImage.side === "reverse" && zoomedImage.hasObverse && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setZoomedImage({ ...zoomedImage, src: `/api/coins/${zoomedImage.coinId}/image/obverse`, subtitle: "Аверс (AV)", side: "obverse" }); }}
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-2.5 bg-white/10 hover:bg-[#D4AF37]/20 active:scale-95 border border-white/10 hover:border-[#D4AF37]/40 rounded-full text-white/70 hover:text-[#D4AF37] transition-all cursor-pointer z-[80] shadow-lg"
              title="Аверс (←)"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Right nav arrow — obverse → reverse */}
          {zoomedImage.coinId && zoomedImage.side === "obverse" && zoomedImage.hasReverse && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setZoomedImage({ ...zoomedImage, src: `/api/coins/${zoomedImage.coinId}/image/reverse`, subtitle: "Реверс (RV)", side: "reverse" }); }}
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 hover:border-white/30 rounded-full text-white/70 hover:text-white transition-all cursor-pointer z-[80] shadow-lg"
              title="Реверс (→)"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Centered Content Container */}
          <div
            className="relative flex flex-col items-center max-w-4xl w-full text-center animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Caption info above image */}
            <div className="mb-4 sm:mb-6 select-none max-w-2xl px-4">
              <h4 className="text-sm font-mono tracking-widest font-bold text-[#D4AF37] uppercase mb-1">
                {zoomedImage.subtitle || "Збільшене зображення"}
              </h4>
              <p className="text-base sm:text-lg font-sans font-semibold text-white/95 line-clamp-1 leading-snug">
                {zoomedImage.title}
              </p>
            </div>

            {/* Main Image Frame with high shadow detail */}
            <div className="relative max-h-[70vh] w-full flex items-center justify-center p-2 rounded-2xl bg-black/40 border border-white/5 shadow-2xl overflow-hidden shadow-black/80">
              <img
                src={zoomedImage.src}
                alt={zoomedImage.title}
                className="max-h-[65vh] max-w-full rounded-lg object-contain select-none md:p-1"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Hint */}
            <p className="mt-4 sm:mt-5 text-[11px] font-mono tracking-wide text-white/40 select-none flex items-center gap-1.5 bg-white/5 border border-white/5 py-1.5 px-3 rounded-full" onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }}>
              {zoomedImage.coinId && (zoomedImage.hasObverse || zoomedImage.hasReverse)
                ? "← → аверс/реверс · ↑ ↓ монета · Esc закрити"
                : "Esc або клік поза межами — закрити"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
