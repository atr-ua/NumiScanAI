/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { Server, Code, Copy, Check, ShieldCheck, Database, FileJson, FileSpreadsheet, Cpu, Sparkles, RefreshCw, BookOpen, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface ServicePageProps {
  apiPort?: number;
}

const BATCH_MODELS = [
  { id: "gemini-2.5-flash",      label: "2.5 Flash",   note: "500/день" },
  { id: "gemini-2.5-pro",        label: "2.5 Pro",     note: "25/день · найточніша" },
  { id: "gemini-3.5-flash",      label: "3.5 Flash",   note: "новітня" },
  { id: "gemini-3.1-flash-lite", label: "3.1 Lite",    note: "надшвидка" },
];

export default function ServicePage({ apiPort = 3001 }: ServicePageProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [batchModel, setBatchModel] = useState(() => localStorage.getItem("batchMintageModel") || "gemini-2.5-flash");
  const [mintageStatus, setMintageStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [mintageRunning, setMintageRunning] = useState(false);

  // Numista sync state
  type NuLog = { type: string; title?: string; fields?: string[]; message?: string };
  const [nuRunning, setNuRunning] = useState(false);
  const [nuProgress, setNuProgress] = useState<{ current: number; total: number } | null>(null);
  const [nuLog, setNuLog] = useState<NuLog[]>([]);
  const [nuDone, setNuDone] = useState<{ updated: number; notFound: number; errors: number } | null>(null);
  const nuLogRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  const handleNumistaSync = (overwrite = false) => {
    if (esRef.current) esRef.current.close();
    setNuRunning(true);
    setNuProgress(null);
    setNuLog([]);
    setNuDone(null);

    const es = new EventSource(`/api/numista-sync?overwrite=${overwrite}`);
    esRef.current = es;

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "start") {
        setNuProgress({ current: 0, total: data.total });
      } else if (data.type === "progress") {
        setNuProgress({ current: data.current, total: data.total });
      } else if (["updated", "not_found", "no_data", "error"].includes(data.type)) {
        setNuLog((prev) => {
          const next = [...prev, data].slice(-100);
          setTimeout(() => nuLogRef.current?.scrollTo({ top: 9999, behavior: "smooth" }), 50);
          return next;
        });
      } else if (data.type === "done") {
        setNuDone(data);
        setNuRunning(false);
        es.close();
      } else if (data.type === "fatal") {
        setNuLog((prev) => [...prev, data]);
        setNuRunning(false);
        es.close();
      }
    };
    es.onerror = () => { setNuRunning(false); es.close(); };
  };

  const stopNumista = () => { esRef.current?.close(); setNuRunning(false); };

  const handleBatchMintage = async (overwrite = false) => {
    setMintageRunning(true);
    setMintageStatus({ text: "⏳ Надсилаю пакет до Gemini…", ok: true });
    try {
      const res = await fetch("/api/batch-mintage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overwrite, model: batchModel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data));
      setMintageStatus({ text: `✓ Оновлено ${data.updated} із ${data.total} монет · пропущено ${data.skipped} вже заповнених`, ok: true });
    } catch (e: any) {
      setMintageStatus({ text: `✗ ${e.message}`, ok: false });
    } finally {
      setMintageRunning(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getUrl = () => {
    // Return relative or default localhost depending on execution
    return typeof window !== "undefined" ? window.location.origin : `http://localhost:${apiPort}`;
  };

  const baseUrl = getUrl();

  const apiEndpoints = [
    {
      method: "GET",
      path: "/api/coins",
      description: "Список усіх монет без фотографій (швидкий запит для каталогу)",
      curl: `curl -X GET "${baseUrl}/api/coins"`,
    },
    {
      method: "GET",
      path: "/api/coins/:id",
      description: "Повні дані однієї монети разом із фотографіями аверсу та реверсу",
      curl: `curl -X GET "${baseUrl}/api/coins/coin_id_here"`,
    },
    {
      method: "POST",
      path: "/api/coins",
      description: "Збереження або оновлення монети (upsert) — якщо id збігається, запис оновлюється",
      curl: `curl -X POST -H 'Content-Type: application/json' -d '{"title":"Нова пам\\u0027ятна монета","country":"Україна","denomination":"10 гривень","year":2024,"metal":"Срібло"}' "${baseUrl}/api/coins"`,
    },
    {
      method: "DELETE",
      path: "/api/coins/:id",
      description: "Видалення монети з каталогу за її унікальним ідентифікатором",
      curl: `curl -X DELETE "${baseUrl}/api/coins/coin_id_here"`,
    },
    {
      method: "POST",
      path: "/api/recognize-coin",
      description: "AI-розпізнавання монети через Gemini — передати base64-фото та (опційно) модель",
      curl: `curl -X POST -H 'Content-Type: application/json' -d '{"image":"<base64>","model":"gemini-2.0-flash"}' "${baseUrl}/api/recognize-coin"`,
    },
  ];

  return (
    <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 flex flex-col gap-6" id="service-integration-panel">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl border border-[#D4AF37]/20">
            <Server className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white font-sans tracking-tight">
              Сервісна інтеграція та REST API
            </h2>
            <p className="text-sm text-white/40 mt-1">
              Керування базою монет ззовні за допомогою веб-запитів та скриптів
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/40 border border-[#D4AF37]/10 text-[#D4AF37] font-mono rounded-full text-xs">
          <Code className="h-3.5 w-3.5 animate-pulse" /> RESTful Server Active
        </span>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-5">
          <p className="text-sm text-white/70 leading-relaxed font-sans">
            Завдяки використанню повностекової архітектури <strong className="text-white">Node.js (Express)</strong>, 
            ваш каталог не є ізольованим усередині інтерфейсу. Ви можете взаємодіяти з базою даних монет через сторонні додатки, 
            скрипти автоматизації або звичайний командний рядок.
          </p>

          <div className="space-y-4">
            <h3 className="text-white font-medium text-xs font-sans uppercase tracking-widest text-[#D4AF37]">
              Доступні веб-інтерфейси (Endpoints)
            </h3>

            <div className="space-y-3">
              {apiEndpoints.map((endpoint, i) => (
                <div key={i} className="bg-black/30 border border-white/5 rounded-2xl overflow-hidden">
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 bg-black/10">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                        endpoint.method === "GET" 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : endpoint.method === "POST" 
                          ? "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20" 
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        {endpoint.method}
                      </span>
                      <code className="text-xs font-mono font-bold text-white/90">{endpoint.path}</code>
                    </div>
                    <span className="text-[11px] font-sans text-white/40">{endpoint.description}</span>
                  </div>

                  <div className="p-3.5 bg-[#0A0A0B]/80 relative group">
                    <pre className="text-[10px] sm:text-xs font-mono text-white/70 overflow-x-auto pr-12 leading-relaxed whitespace-pre-wrap">
                      {endpoint.curl}
                    </pre>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(endpoint.curl, `endpoint-${i}`)}
                      className="absolute top-3 right-3 p-2 bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 rounded-xl transition-all cursor-pointer opacity-80 group-hover:opacity-100 flex items-center justify-center"
                      title="Скопіювати команду"
                    >
                      {copiedId === `endpoint-${i}` ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-[#D4AF37]" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-5">
          <div className="bg-black/40 border border-white/5 p-5 rounded-2xl space-y-4">
            <h4 className="text-white font-semibold text-sm flex items-center gap-1.5 font-sans">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />
              Локальне збереження та синхронізація
            </h4>
            <div className="space-y-3 text-xs text-white/60 font-sans leading-relaxed">
              <p>
                Будь-які зміни (створення нової монети, ШІ завантаження, редагування полів аверсу/реверсу чи видалення монети)
                миттєво зберігаються у локальну базу даних:
              </p>
              <div className="bg-black/50 p-3 rounded-xl border border-white/5 text-[10px] font-mono text-[#D4AF37] break-all">
                coins.db (SQLite)
              </div>
              <p>
                Це забезпечує надійне збереження даних між сесіями та після перезапуску сервера. Зображення зберігаються безпосередньо у базі даних у форматі base64.
              </p>
            </div>
          </div>

          <div className="bg-[#1A1A1C] border border-[#D4AF37]/10 p-5 rounded-2xl space-y-4">
            <h4 className="text-white font-semibold text-sm flex items-center gap-1.5 font-sans">
              <Cpu className="h-4.5 w-4.5 text-[#D4AF37]" />
              Взаємодія із хмарою Google
            </h4>
            <p className="text-xs text-white/50 leading-relaxed font-sans">
              Для автентичного визначення характеристик монети (номінал, метал, ріккарбування, історичні довідки) сервіс
              надсилає фотографію до хмарної платформи Google через інноваційний SDK <code className="text-white font-mono bg-black/40 px-1 py-0.5 rounded">@google/genai</code>.
              Це гарантує точне та миттєве збагачення даних без додаткових Python-залежностей.
            </p>
          </div>
        </div>
      </div>

      {/* Batch Mintage */}
      <div className="border-t border-white/5 pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#D4AF37]" />
          <h3 className="text-white font-semibold text-sm font-sans">Пакетне оновлення тиражів (Gemini)</h3>
        </div>
        <p className="text-xs text-white/50 leading-relaxed font-sans">
          Один пакетний запит до Gemini для заповнення трьох полів одночасно:
          <code className="text-white/70 font-mono bg-black/40 px-1 py-0.5 rounded mx-1">тираж</code>
          <code className="text-white/70 font-mono bg-black/40 px-1 py-0.5 rounded mx-1">товщина</code>
          <code className="text-white/70 font-mono bg-black/40 px-1 py-0.5 rounded mx-1">гурт</code>.
          Обробка по 30 монет із паузами. "Заповнити порожні" — лише монети де хоча б одне поле відсутнє.
        </p>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[11px] text-white/40 font-mono">Модель:</span>
          {BATCH_MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { setBatchModel(m.id); localStorage.setItem("batchMintageModel", m.id); }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                batchModel === m.id
                  ? "bg-[#D4AF37]/15 border-[#D4AF37]/50 text-[#D4AF37]"
                  : "bg-transparent border-white/10 text-white/40 hover:border-white/25 hover:text-white/60"
              }`}
            >
              {m.label} <span className="opacity-50">· {m.note}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleBatchMintage(false)}
            disabled={mintageRunning}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {mintageRunning ? "Виконується…" : "Заповнити порожні тиражі"}
          </button>
          <button
            type="button"
            onClick={() => handleBatchMintage(true)}
            disabled={mintageRunning}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/25 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Перезаписати всі
          </button>
        </div>

        {mintageStatus && (
          <div className={`text-[11px] font-mono px-3 py-2 rounded-xl border ${mintageStatus.ok ? "border-emerald-500/20 text-emerald-400/80 bg-emerald-500/5" : "border-red-500/20 text-red-400/80 bg-red-500/5"}`}>
            {mintageStatus.text}
          </div>
        )}
      </div>

      {/* Numista sync */}
      <div className="border-t border-white/5 pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-emerald-400" />
          <h3 className="text-white font-semibold text-sm font-sans">Синхронізація з Numista</h3>
          <span className="text-[10px] font-mono text-white/30 ml-auto">numista.com API v3</span>
        </div>
        <p className="text-xs text-white/50 leading-relaxed font-sans">
          Оновлює для кожної монети: <code className="text-white/70 font-mono bg-black/40 px-1 py-0.5 rounded mx-0.5">вага</code>
          <code className="text-white/70 font-mono bg-black/40 px-1 py-0.5 rounded mx-0.5">діаметр</code>
          <code className="text-white/70 font-mono bg-black/40 px-1 py-0.5 rounded mx-0.5">товщина</code>
          <code className="text-white/70 font-mono bg-black/40 px-1 py-0.5 rounded mx-0.5">гурт</code>
          <code className="text-white/70 font-mono bg-black/40 px-1 py-0.5 rounded mx-0.5">тираж</code>.
          Пошук по базі Numista (~600 000 монет). Два запити на монету, затримка 400 мс між ними.
        </p>

        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => handleNumistaSync(false)} disabled={nuRunning}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            <BookOpen className="h-3.5 w-3.5" />
            {nuRunning ? "Виконується…" : "Заповнити порожні"}
          </button>
          <button type="button" onClick={() => handleNumistaSync(true)} disabled={nuRunning}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/25 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            <RefreshCw className="h-3.5 w-3.5" />
            Перезаписати всі
          </button>
          {nuRunning && (
            <button type="button" onClick={stopNumista}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer">
              <XCircle className="h-3.5 w-3.5" /> Зупинити
            </button>
          )}
        </div>

        {/* Progress bar */}
        {nuProgress && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-mono text-white/40">
              <span>{nuProgress.current} / {nuProgress.total} монет</span>
              <span>{Math.round((nuProgress.current / nuProgress.total) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500/60 rounded-full transition-all duration-300"
                style={{ width: `${(nuProgress.current / nuProgress.total) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Done summary */}
        {nuDone && (
          <div className="flex gap-3 text-xs font-mono">
            <span className="text-emerald-400">✓ {nuDone.updated} оновлено</span>
            <span className="text-white/30">· {nuDone.notFound} не знайдено</span>
            {nuDone.errors > 0 && <span className="text-red-400">· {nuDone.errors} помилок</span>}
          </div>
        )}

        {/* Live log */}
        {nuLog.length > 0 && (
          <div ref={nuLogRef} className="max-h-48 overflow-y-auto bg-black/40 border border-white/5 rounded-xl p-3 space-y-0.5 text-[10px] font-mono">
            {nuLog.map((entry, i) => (
              <div key={i} className="flex items-start gap-1.5 leading-relaxed">
                {entry.type === "updated"   && <CheckCircle  className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />}
                {entry.type === "not_found" && <AlertCircle  className="h-3 w-3 text-white/25   shrink-0 mt-0.5" />}
                {entry.type === "no_data"   && <AlertCircle  className="h-3 w-3 text-white/25   shrink-0 mt-0.5" />}
                {entry.type === "error"     && <XCircle      className="h-3 w-3 text-red-400     shrink-0 mt-0.5" />}
                {entry.type === "fatal"     && <XCircle      className="h-3 w-3 text-red-400     shrink-0 mt-0.5" />}
                <span className={
                  entry.type === "updated"   ? "text-white/70" :
                  entry.type === "error" || entry.type === "fatal" ? "text-red-400/80" :
                  "text-white/25"
                }>
                  {entry.title || entry.message}
                  {entry.fields?.length ? ` → ${entry.fields.join(", ")}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
