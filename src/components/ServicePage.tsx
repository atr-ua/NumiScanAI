/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Server, Code, Copy, Check, ShieldCheck, Database, FileJson, FileSpreadsheet, Cpu } from "lucide-react";

interface ServicePageProps {
  apiPort?: number;
}

export default function ServicePage({ apiPort = 3001 }: ServicePageProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    </div>
  );
}
