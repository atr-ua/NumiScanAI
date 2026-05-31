/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * @author Andrii (ATR) Tarasenko
 */

import { useState, useEffect } from "react";
import { Coin } from "./types";
import CoinUpload from "./components/CoinUpload";
import CoinDatabase, { fixTitleWithYear } from "./components/CoinDatabase";
import CollectionAnalytics from "./components/CollectionAnalytics";
import ServicePage from "./components/ServicePage";
import { Coins, Database, ShieldCheck, Sparkles, Award, Plus, Compass, Server, AlertTriangle } from "lucide-react";
import CountryFlag from "./components/CountryFlag";

export default function App() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"database" | "recognition" | "statistics" | "service">("database");

  // Temporary container to show recently recognized coin before saving it to database
  const [recentRecognized, setRecentRecognized] = useState<Partial<Coin> | null>(null);
  const [notesInput, setNotesInput] = useState("");
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem("selectedModel") || "gemini-3.5-flash");
  const [duplicates, setDuplicates] = useState<Coin[]>([]);
  const [countryFilter, setCountryFilter] = useState<string | undefined>(undefined);

  // Fetch all coins on mount
  useEffect(() => {
    fetchCoins();
  }, []);

  const fetchCoins = async () => {
    try {
      const res = await fetch("/api/coins");
      if (res.ok) {
        const data = await res.json();
        setCoins(data);
      }
    } catch (err) {
      console.error("Помилка завантаження колекції:", err);
    }
  };

  const findDuplicates = (recognized: Partial<Coin>): Coin[] => {
    return coins.filter((coin) => {
      const sameCountry = (coin.country || "").toLowerCase() === (recognized.country || "").toLowerCase();
      const sameYear = String(coin.year || "").trim() === String(recognized.year || "").trim();
      const sameDenom = (coin.denomination || "").toLowerCase().trim() === (recognized.denomination || "").toLowerCase().trim();
      if (sameCountry && sameYear && sameDenom) return true;

      // Fallback: title word-overlap ≥ 60%, but only within same country AND denomination
      if (!sameCountry || !sameDenom) return false;
      const wordsA = (coin.title || "").toLowerCase().split(/\W+/).filter(Boolean);
      const wordsB = (recognized.title || "").toLowerCase().split(/\W+/).filter(Boolean);
      if (wordsA.length === 0 || wordsB.length === 0) return false;
      const overlap = wordsA.filter((w) => wordsB.includes(w)).length;
      return overlap / Math.max(wordsA.length, wordsB.length) >= 0.6;
    });
  };

  // Perform Gemini AI Coin recognition
  const handleRecognizeCoin = async (obverse: string, reverse?: string) => {
    setIsRecognizing(true);
    setRecognitionError(null);
    setRecentRecognized(null);
    setDuplicates([]);
    try {
      const res = await fetch("/api/recognize-coin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: obverse, imageReverse: reverse, model: selectedModel }),
      });

      if (!res.ok) {
        const errObj = await res.json();
        throw new Error(errObj.error || "Не вдалося розпізнати монету ШІ.");
      }

      const originalData = await res.json();
      const actualObverse = (originalData.imagesSwapped && reverse) ? reverse : obverse;
      const actualReverse = (originalData.imagesSwapped && reverse) ? obverse : reverse;
      const recognized = { ...originalData, image: actualObverse, imageObverse: actualObverse, ...(actualReverse ? { imageReverse: actualReverse } : {}) };
      setRecentRecognized(recognized);
      setDuplicates(findDuplicates(recognized));
      setNotesInput("");
    } catch (err: any) {
      console.error("Помилка при з'єднанні з API:", err);
      setRecognitionError(err.message || "Сталася неочікувана помилка.");
    } finally {
      setIsRecognizing(false);
    }
  };


  // Persists coin structure to database
  const handleSaveToCatalog = async () => {
    if (!recentRecognized) return;
    try {
      const draftTitle = recentRecognized.title || "";
      const draftYear = recentRecognized.year || "";
      const refinedTitle = fixTitleWithYear(draftTitle, draftYear);

      const payload: Partial<Coin> = {
        ...recentRecognized,
        title: refinedTitle,
        notes: notesInput,
      };

      const res = await fetch("/api/coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Refresh catalog list
        await fetchCoins();
        // Clear workspace
        setRecentRecognized(null);
        setNotesInput("");
        setDuplicates([]);
        // Switch tab to show database, clear any active filters
        setCountryFilter(undefined);
        setActiveTab("database");
        // Instantly focus catalog panel by scrolling slightly
        setTimeout(() => {
          document.getElementById("coin-catalog-panel")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        alert("Помилка при додаванні до колекції.");
      }
    } catch (err) {
      console.error("Помилка при зберіганні:", err);
    }
  };

  // Remove individual coin
  const handleDeleteCoin = async (id: string) => {
    try {
      const res = await fetch(`/api/coins/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCoins(coins.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error("Помилка при видаленні монети:", err);
    }
  };

  // Update coin details
  const handleUpdateCoin = async (updatedCoin: Coin) => {
    try {
      const res = await fetch("/api/coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedCoin),
      });
      if (res.ok) {
        setCoins(coins.map((c) => (c.id === updatedCoin.id ? updatedCoin : c)));
      }
    } catch (err) {
      console.error("Помилка оновлення відомостей:", err);
    }
  };

  const handleReorderCoins = async (ids: string[]) => {
    try {
      await fetch("/api/coins/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      await fetchCoins();
    } catch (err) {
      console.error("Помилка сортування:", err);
    }
  };

  // Catalog statistics metrics
  const estimatedSilverCount = coins.filter((c) => (c.metal || "").toLowerCase().includes("срібл")).length;
  const estimatedGoldCount = coins.filter((c) => (c.metal || "").toLowerCase().includes("золот")).length;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E0E0E0] font-sans flex flex-col justify-between">
      {/* Upper Navigation Bar */}
      <header className="border-b border-white/10 bg-[#0D0D0E] sticky top-0 z-40" id="navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-[#D4AF37] to-[#F2D06B] rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)]">
              <div className="w-4 h-4 border-2 border-[#0A0A0B] rounded-full"></div>
            </div>
            <div>
              <span className="font-sans font-semibold text-white text-base tracking-tight block">
                ATR NumiScan <span className="text-[#D4AF37] opacity-85">AI</span>
              </span>
              <span className="text-[9px] text-white/40 font-mono tracking-wider block uppercase">
                Numismat Workstation & Web DB
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
              Node.js Web Server Active
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full gap-8 flex flex-col">
        {/* Intro Banner Section */}
        <div className="bg-[#121214] text-[#E0E0E0] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 animate-fade-in">
          <div className="relative z-10 flex-1 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-xs font-medium rounded-full">
              <Compass className="h-3.5 w-3.5" /> Ласкаво просимо до ATR NumiScan AI
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-white leading-tight">
              Інтелектуальне визначення монет
            </h1>
            <p className="text-sm text-white/60 leading-relaxed max-w-2xl">
              Використовуйте повностекове хмарне розпізнавання на базі ШІ Gemini для миттєвої оцінки та аналізу характеристик. 
              Кураторство вашої колекції, визначення металів, ринкових цін та безпечне збереження у каталог виконуються 
              безпосередньо на нашому веб-сервері в режимі реального часу.
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3 w-full md:w-auto flex-shrink-0" id="statistics-grid">
            <div className="bg-black/45 border border-white/5 p-4 rounded-2xl text-center min-w-[105px]">
              <span className="text-white/30 text-[10px] font-mono block uppercase tracking-wider">Всього</span>
              <strong className="text-2xl font-serif text-white block mt-1">{coins.length}</strong>
            </div>
            <div className="bg-black/45 border border-white/5 p-4 rounded-2xl text-center min-w-[105px]">
              <span className="text-[#D4AF37]/40 text-[10px] font-mono block uppercase tracking-wider">Срібні</span>
              <strong className="text-2xl font-serif text-white block mt-1">{estimatedSilverCount}</strong>
            </div>
            <div className="bg-black/45 border border-white/5 p-4 rounded-2xl text-center min-w-[105px]">
              <span className="text-[#D4AF37]/40 text-[10px] font-mono block uppercase tracking-wider">Золоті</span>
              <strong className="text-2xl font-serif text-[#D4AF37] block mt-1">{estimatedGoldCount}</strong>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Selector */}
        <div className="flex flex-wrap items-center justify-start gap-2 bg-[#121214] p-1.5 rounded-2xl border border-white/5 self-start">
          <button
            type="button"
            onClick={() => setActiveTab("database")}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold font-sans tracking-wide transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeTab === "database"
                ? "bg-[#D4AF37] text-[#0A0A0B] shadow-lg shadow-[#D4AF37]/20 font-bold"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <Database className="h-4 w-4" />
            База монет ({coins.length})
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab("recognition")}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold font-sans tracking-wide transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeTab === "recognition"
                ? "bg-[#D4AF37] text-[#0A0A0B] shadow-lg shadow-[#D4AF37]/20 font-bold"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            ШІ-Розпізнавання & Додавання
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab("statistics")}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold font-sans tracking-wide transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeTab === "statistics"
                ? "bg-[#D4AF37] text-[#0A0A0B] shadow-lg shadow-[#D4AF37]/20 font-bold"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <Award className="h-4 w-4" />
            Статистика колекції
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("service")}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold font-sans tracking-wide transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeTab === "service"
                ? "bg-[#D4AF37] text-[#0A0A0B] shadow-lg shadow-[#D4AF37]/20 font-bold"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <Server className="h-4 w-4" />
            Сервіси & REST API
          </button>
        </div>

        {/* Tab Content Rendering */}
        <div className="w-full">
          {activeTab === "database" && (
            <div className="animate-fade-in w-full">
              <CoinDatabase
                coins={coins}
                onDeleteCoin={handleDeleteCoin}
                onUpdateCoin={handleUpdateCoin}
                onReorderCoins={handleReorderCoins}
                countryFilter={countryFilter}
                onClearCountryFilter={() => setCountryFilter(undefined)}
              />
            </div>
          )}

          {activeTab === "recognition" && (
            <div className="flex flex-col gap-6 animate-fade-in">
            {/* Model selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[10px] text-white/35 font-mono uppercase tracking-widest shrink-0">Модель ШІ:</span>
              {([
                { id: "gemini-3.1-flash-lite", label: "3.1 Lite",    note: "надшвидка" },
                { id: "gemini-2.5-flash",      label: "2.5 Flash",   note: "500/день · точніша" },
                { id: "gemini-2.5-pro",        label: "2.5 Pro",     note: "25/день · максимальна" },
                { id: "gemini-3.5-flash",      label: "3.5 Flash",   note: "новітня" },
              ] as const).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setSelectedModel(m.id); localStorage.setItem("selectedModel", m.id); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                    selectedModel === m.id
                      ? "bg-[#D4AF37]/15 border-[#D4AF37]/50 text-[#D4AF37]"
                      : "bg-transparent border-white/10 text-white/40 hover:border-white/25 hover:text-white/60"
                  }`}
                >
                  {m.label}
                  <span className={`font-normal ${selectedModel === m.id ? "text-[#D4AF37]/60" : "text-white/25"}`}>
                    · {m.note}
                  </span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Upload and Capture card */}
              <div className="lg:col-span-5 flex flex-col gap-8">
                <CoinUpload
                  onRecognize={handleRecognizeCoin}
                  isRecognizing={isRecognizing}
                  recognitionError={recognitionError}
                />
              </div>

              {/* Right Column: AI Results draft panel or waiting card */}
              <div className="lg:col-span-7">
                {recentRecognized ? (
                  <div className="bg-[#1A1A1C] border border-[#D4AF37]/35 rounded-3xl p-6 shadow-xl flex flex-col gap-4 animate-fade-in" id="draft-result-panel">
                    <div>
                      <div className="text-[10px] text-[#D4AF37] uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 fill-[#D4AF37]" /> Знайдено нові дані
                      </div>
                      <h3 className="text-xl font-bold text-white leading-tight font-sans">
                        {recentRecognized.title}
                      </h3>
                      <p className="text-xs text-white/40 flex items-center gap-1.5">
                        {recentRecognized.country && (
                          <CountryFlag country={recentRecognized.country} fallbackSizeClass="text-sm" />
                        )}
                        {recentRecognized.country}, {recentRecognized.year || "Серія випуску"}
                      </p>
                    </div>

                    <div className="space-y-4 text-xs text-white/60">
                      <div className="bg-black/30 p-4 border border-white/5 rounded-2xl font-mono space-y-2.5 leading-relaxed text-xs">
                        <div className="flex justify-between border-b border-white/5 pb-1.5">
                          <span className="text-white/40">Назва:</span>
                          <strong className="text-white truncate pl-4 max-w-[210px]">{recentRecognized.title}</strong>
                        </div>
                        <div className="flex justify-between border-b border-white/5 py-1.5 border-slate-200/50">
                          <span className="text-white/40">Країна:</span>
                          <strong className="text-white flex items-center gap-1.5">
                            {recentRecognized.country && (
                              <CountryFlag country={recentRecognized.country} fallbackSizeClass="text-sm" />
                            )}
                            {recentRecognized.country}
                          </strong>
                        </div>
                        <div className="flex justify-between border-b border-white/5 py-1.5 border-slate-200/50">
                          <span className="text-white/40">Рік карбування:</span>
                          <strong className="text-white">{recentRecognized.year}</strong>
                        </div>
                        <div className="flex justify-between border-b border-white/5 py-1.5 border-slate-200/50">
                          <span className="text-white/40">Метал/Сплав:</span>
                          <strong className="text-white">{recentRecognized.metal}</strong>
                        </div>
                        <div className="flex justify-between border-b border-white/5 py-1.5 border-slate-200/50">
                          <span className="text-white/40">Ринкова ціна:</span>
                          <strong className="text-[#D4AF37] font-bold">{recentRecognized.estimatedValue}</strong>
                        </div>
                        <div className="flex justify-between border-b border-white/5 py-1.5 border-slate-200/50">
                          <span className="text-white/40">Ступінь рідкості:</span>
                          <strong className="text-white">{recentRecognized.rarity}</strong>
                        </div>
                        <div className="flex justify-between border-b border-white/5 py-1.5 border-slate-200/50">
                          <span className="text-white/40">Збереженість:</span>
                          <strong className="text-[#D4AF37]/80 font-bold">{recentRecognized.grade}</strong>
                        </div>
                      </div>

                      <div className="space-y-1 bg-black/20 p-4 rounded-xl border border-white/5">
                        <span className="font-semibold text-[10px] text-white/40 font-mono block">ІСТОРИЧНІ ВІДОМОСТІ:</span>
                        <p className="text-justify leading-relaxed text-white/70 mt-1 max-h-48 overflow-y-auto pr-1">
                          {recentRecognized.historicalContext}
                        </p>
                      </div>

                      {/* Duplicate warning */}
                      {duplicates.length > 0 && (
                        <div className="space-y-2 bg-amber-500/5 border border-amber-500/25 rounded-2xl p-4">
                          <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-mono font-bold uppercase tracking-widest">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Можливий дубль ({duplicates.length})
                          </div>
                          <p className="text-[10px] text-white/35 leading-relaxed">
                            У каталозі вже є схожі монети. Перевірте перед збереженням.
                          </p>
                          <div className="space-y-1.5">
                            {duplicates.map((d) => (
                              <div key={d.id} className="flex items-center justify-between gap-2 bg-black/30 px-3 py-2 rounded-xl">
                                <span className="text-[11px] text-white/70 truncate">{d.title}</span>
                                <span className="text-[10px] text-amber-400/70 font-mono shrink-0">{d.grade}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Comments input form */}
                      <div className="space-y-1.5 flex flex-col">
                        <label className="font-semibold text-white/50 text-xs font-sans">
                          Особисті замітки або сповіщення для каталогу:
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Наприклад: в ідеальному стані, подарунок дідуся, куплено..."
                          value={notesInput}
                          onChange={(e) => setNotesInput(e.target.value)}
                          className="border border-white/10 bg-black/40 text-xs p-3.5 rounded-xl focus:border-[#D4AF37] focus:outline-none placeholder:text-white/30 text-white w-full leading-relaxed"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveToCatalog}
                      className="w-full bg-[#D4AF37] hover:bg-[#c4a030] text-[#0A0A0B] font-bold px-5 py-3.5 rounded-2xl shadow-lg shadow-[#D4AF37]/20 hover:scale-[1.01] active:scale-[99%] text-xs flex items-center justify-center gap-2 transition-transform cursor-pointer"
                    >
                      <Plus className="h-4 w-4" /> Додати монету до колекційного каталогу
                    </button>
                  </div>
                ) : (
                  <div className="h-full min-h-[300px] border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-4 text-white/40 text-center p-8 bg-[#121214]">
                    <div className="p-4 bg-[#D4AF37]/10 rounded-full border border-[#D4AF37]/20 text-[#D4AF37]">
                      <Sparkles className="h-8 w-8 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-md font-semibold text-white font-sans">Очікування сканування монети</h3>
                      <p className="text-xs text-white/40 mt-1.5 max-w-sm leading-relaxed font-sans">
                        Завантажте фото монети або зробіть знімок за допомогою камери ліворуч. 
                        Суперкомп'ютерний ШІ Gemini миттєво визначить характеристики монети та сформує новий запис для вашого узгодження!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </div>
          )}

          {activeTab === "statistics" && (
            <div className="animate-fade-in w-full">
              <CollectionAnalytics
                coins={coins}
                onFilterByCountry={(country) => {
                  setCountryFilter(country);
                  setActiveTab("database");
                }}
              />
            </div>
          )}

          {activeTab === "service" && (
            <div className="animate-fade-in w-full">
              <ServicePage />
            </div>
          )}
        </div>
      </main>

      {/* Decorative footer */}
      <footer className="border-t border-white/5 bg-[#0D0D0E] py-6 mt-12 text-center text-[10px] text-white/30 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p>
            © 2026 ЛОКАЛЬНИЙ ПУЛ ТА БАЗА РОЗПІЗНАННЯ МОНЕТ. Всі права збережено.
          </p>
          <div className="flex justify-center gap-6">
            <span>ENGINE: Node.js (v20+)</span>
            <span>Vite + Express REST API Workspace</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
