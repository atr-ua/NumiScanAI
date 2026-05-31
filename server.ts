/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * @author Andrii (ATR) Tarasenko
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { initDb, dbGetCoins, dbGetCoin, dbSaveCoin, dbDeleteCoin, dbReorderCoins, dbGetCoinsForMintage, dbUpdateSpecs } from "./src/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Increase payload bounds for base64 image uploads
app.use(express.json({ limit: "20mb" }));

// Safe environment key handling
const getApiKey = () => {
  return process.env.GEMINI_API_KEY || "";
};

// API: Version info from git
app.get("/api/version", async (_req, res) => {
  try {
    const { execSync } = await import("child_process");
    const hash    = execSync("git rev-parse --short HEAD",         { encoding: "utf8" }).trim();
    const date    = execSync("git log -1 --format=%ci HEAD",       { encoding: "utf8" }).trim().slice(0, 10);
    const subject = execSync("git log -1 --format=%s HEAD",        { encoding: "utf8" }).trim();
    const tag     = execSync("git describe --tags --abbrev=0 2>nul || echo", { encoding: "utf8" }).trim();
    res.json({ hash, date, subject, tag: tag || null });
  } catch {
    res.json({ hash: "unknown", date: null, subject: null, tag: null });
  }
});

// API: Get all coins (without images — fast list)
app.get("/api/coins", async (_req, res) => {
  try {
    const coins = await dbGetCoins();
    res.json(coins);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// API: Serve coin image as binary (browser-cacheable)
app.get("/api/coins/:id/image/:side", async (req, res) => {
  try {
    const coin = await dbGetCoin(req.params.id);
    if (!coin) return res.status(404).end();
    const field = req.params.side === "reverse" ? "imageReverse" : (coin.imageObverse ? "imageObverse" : "image");
    const base64 = coin[field] || coin.image || "";
    if (!base64) return res.status(404).end();
    const match = base64.match(/^data:image\/(\w+);base64,(.+)$/s);
    const mime = match ? `image/${match[1]}` : "image/jpeg";
    const data = match ? match[2] : base64;
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    res.send(Buffer.from(data, "base64"));
  } catch (e: any) {
    res.status(500).end();
  }
});

// API: Get single coin with full image data
app.get("/api/coins/:id", async (req, res) => {
  try {
    const coin = await dbGetCoin(req.params.id);
    if (!coin) return res.status(404).json({ error: "Not found" });
    res.json(coin);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// API: Save or update a coin
app.post("/api/coins", async (req, res) => {
  try {
    const saved = await dbSaveCoin(req.body);
    res.json(saved);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// API: Reorder coins by assigning vis_id 1..N
app.post("/api/coins/reorder", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: "ids must be an array" });
    await dbReorderCoins(ids);
    res.json({ success: true, count: ids.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// API: Delete coin
app.delete("/api/coins/:id", async (req, res) => {
  try {
    await dbDeleteCoin(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// API: Batch-update mintage for all coins via Gemini (text-only, no images)
app.post("/api/batch-mintage", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY відсутній" });

  const { overwrite = false, model = "gemini-2.0-flash" } = req.body || {};

  try {
    const allCoins = await dbGetCoinsForMintage();
    const isEmpty = (v: string) => !v || v.trim() === "" || v === "Невідомо";
    const targets = overwrite
      ? allCoins
      : allCoins.filter((c) => isEmpty(c.mintage) || isEmpty(c.thickness) || isEmpty(c.edge));

    if (targets.length === 0) return res.json({ updated: 0, skipped: allCoins.length });

    const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });

    const coinList = targets.map((c) => ({
      id: c.id,
      title: c.title,
      country: c.country,
      year: c.year,
      denomination: c.denomination,
      metal: c.metal,
    }));

    const CHUNK = 30;
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const schema = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id:        { type: Type.STRING },
            mintage:   { type: Type.STRING },
            thickness: { type: Type.STRING },
            edge:      { type: Type.STRING },
          },
          required: ["id", "mintage", "thickness", "edge"],
        },
      },
    };

    const promptBase = `You are an expert numismatist with access to comprehensive world coin databases (NGC, PCGS, Krause, national mint reports).
For each coin provide: mintage (тираж), thickness in mm (товщина), edge type in Ukrainian (гурт: гладкий/рифлений/написовий/сегментований/комбінований).
Use "Невідомо" only if genuinely unknown. Mintage format: "1 000 000 шт", "~500 000 шт", "50 000 шт (пруф)".
Coins:\n`;

    let updated = 0;
    for (let i = 0; i < coinList.length; i += CHUNK) {
      const chunk = coinList.slice(i, i + CHUNK);
      try {
        const response = await ai.models.generateContent({
          model,
          contents: { parts: [{ text: promptBase + JSON.stringify(chunk, null, 2) }] },
          config: schema,
        });
        const results: { id: string; mintage?: string; thickness?: string; edge?: string }[] = JSON.parse(response.text || "[]");
        for (const item of results) {
          if (item.id) { await dbUpdateSpecs(item.id, { mintage: item.mintage, thickness: item.thickness, edge: item.edge }); updated++; }
        }
      } catch (chunkErr: any) {
        console.error(`[batch-mintage] chunk ${i}-${i + CHUNK} error:`, chunkErr.message);
      }
      if (i + CHUNK < coinList.length) await delay(3000);
    }

    res.json({ updated, total: targets.length, skipped: allCoins.length - targets.length });
  } catch (e: any) {
    console.error("[batch-mintage]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// API: Recognize coin via Gemini
app.post("/api/recognize-coin", async (req, res) => {
  const { image, imageReverse, correction, previousResult, model } = req.body;
  const modelName: string = model || "gemini-2.0-flash";
  if (!image) {
    return res.status(400).json({ error: "Зображення не передано" });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(500).json({
      error: "Ключ доступу API (GEMINI_API_KEY) відсутній. Будь ласка, введіть його в бічній панелі Settings > Secrets."
    });
  }

  try {
    // Extract actual base64 data (strip data:image/jpeg;base64, etc.)
    const base64Match = image.match(/^data:image\/\w+;base64,(.+)$/);
    const cleanBase64 = base64Match ? base64Match[1] : image;

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const imageParts: { inlineData: { mimeType: string; data: string } }[] = [
      { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
    ];

    if (imageReverse) {
      const revMatch = (imageReverse as string).match(/^data:image\/\w+;base64,(.+)$/);
      const cleanRev = revMatch ? revMatch[1] : imageReverse;
      imageParts.push({ inlineData: { mimeType: "image/jpeg", data: cleanRev } });
    }

    const isRefinement = !!(correction && previousResult);
    const hasBothSides = imageParts.length === 2;

    const textPart = isRefinement
      ? {
          text: `You previously identified this coin with the following data:
${JSON.stringify(previousResult, null, 2)}

The user has provided a correction: "${correction}"

Re-examine the coin image(s) with this correction in mind. Update ALL fields that are affected by the correction (e.g. if denomination changed, update weight, diameter, estimatedValue, rarity, historicalContext accordingly). Keep fields that are still correct. Your response MUST be in Ukrainian.`
        }
      : {
          text: hasBothSides
            ? `You are given TWO images of the same coin: the first is labeled obverse, the second is labeled reverse. Identify the coin using both images. Also determine whether the images are actually in the correct order — if the first image looks like a reverse (tails/coat of arms side without a portrait or denomination on the front) and the second looks like the obverse (heads), set imagesSwapped to true. Your response MUST be in Ukrainian.`
            : `Identify this coin from its image. Look for year, denomination, portraits, emblem, country, or specific lettering. If it's blurry or ambiguous, give the most likely candidate based on numismatic visual elements. Your response MUST be in Ukrainian.`
        };

    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: [...imageParts, textPart] },
      config: {
        systemInstruction: isRefinement
          ? "You are an expert world coin analyst and professional numismatist. The user has provided a correction to your previous coin identification. Update the coin data based on this correction, re-deriving all dependent fields (geometry, value, rarity, history). Respond with structured JSON only. Use Ukrainian language."
          : "You are an expert world coin analyst and professional numismatist. Given an image of a coin (or obverse/reverse), identify it. You respond with structured JSON only, strictly matching the output schema. Use Ukrainian language translations for metal composition, country of origin, rarity levels, and historical text.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "Назва монети, наприклад, '2 гривні (2018)' або '10 копійок (1992)'"
            },
            denomination: {
              type: Type.STRING,
              description: "Номінал монети, наприклад, '2 гривні'"
            },
            country: {
              type: Type.STRING,
              description: "Країна походження монети, наприклад, 'Україна', 'Німеччина'"
            },
            year: {
              type: Type.STRING,
              description: "Рік карбування, наприклад, '2018', '1992' або 'Невідомо'"
            },
            metal: {
              type: Type.STRING,
              description: "Метал чи метал сплаву монети, наприклад, 'Оцинкована сталь', 'Нейзильбер', 'Алюмінієва бронза', 'Срібло'"
            },
            weight: {
              type: Type.STRING,
              description: "Орієнтовна вага монети, наприклад, '4.0 г'"
            },
            diameter: {
              type: Type.STRING,
              description: "Орієнтовний діаметр монети, наприклад, '22.0 мм'"
            },
            estimatedValue: {
              type: Type.STRING,
              description: "Орієнтовна ринкова вага/вартість монети в UAH, наприклад, 'номінал', '10 - 50 грн' або '500 грн'"
            },
            mintage: {
              type: Type.STRING,
              description: "Тираж монети — кількість відкарбованих примірників, наприклад, '1 000 000 шт', '50 000 шт (proof)', 'Невідомо'."
            },
            thickness: {
              type: Type.STRING,
              description: "Товщина монети в мм, наприклад, '1.8 мм', '2.0 мм'. 'Невідомо' якщо немає даних."
            },
            edge: {
              type: Type.STRING,
              description: "Тип гурту монети українською: 'гладкий', 'рифлений', 'написовий', 'сегментований', 'комбінований' тощо. 'Невідомо' якщо немає даних."
            },
            rarity: {
              type: Type.STRING,
              description: "Рівень рідкості монети, наприклад: 'Звичайна', 'Нечаста', 'Рідкісна', 'Колекційна'"
            },
            grade: {
              type: Type.STRING,
              description: "Оцінка збереженості за замовчуванням, наприклад 'VF' або 'XF' або 'UNC'"
            },
            historicalContext: {
              type: Type.STRING,
              description: "Багатий опис історії монети, символізму гербів, або цікавих особливостей тиражу українською мовою."
            },
            imagesSwapped: {
              type: Type.BOOLEAN,
              description: "true if the two provided images appear to be in reversed order (first image is actually the reverse side, second is the obverse). false otherwise or if only one image was provided."
            }
          },
          required: ["title", "denomination", "country", "year", "metal", "weight", "diameter", "estimatedValue", "rarity", "grade", "historicalContext"]
        }
      }
    });

    const parsedJson = JSON.parse(response.text || "{}");
    res.json(parsedJson);
  } catch (error: any) {
    console.error("Помилка при виклику Gemini API:", error);
    res.status(500).json({
      error: error.message || "Сталася помилка при розпізнаванні монети AI. Перевірте з'єднання або ключ API."
    });
  }
});

// ── Numista helpers ───────────────────────────────────────────────────────────

const NUMISTA_BASE = "https://api.numista.com/api/v3";
const NUMISTA_SEARCH = "/types";   // coin type search (specs: weight, size, etc.)

const EDGE_UA: Record<string, string> = {
  plain: "гладкий", smooth: "гладкий",
  reeded: "рифлений", milled: "рифлений",
  lettered: "написовий", inscribed: "написовий",
  segmented: "сегментований", "segmented reeding": "сегментований рифлений",
  ornamented: "орнаментований", grooved: "рифлений",
  "plain and reeded sections": "комбінований",
};

const ISO_TO_EN: Record<string, string> = {
  ua:"ukraine", us:"united states", gb:"united kingdom", de:"germany",
  fr:"france", it:"italy", es:"spain", ca:"canada", au:"australia", nz:"new zealand",
  jp:"japan", cn:"china", ru:"russia", pl:"poland", nl:"netherlands", be:"belgium",
  se:"sweden", no:"norway", dk:"denmark", fi:"finland", at:"austria", ch:"switzerland",
  cz:"czechia", sk:"slovakia", hu:"hungary", ro:"romania", bg:"bulgaria", tr:"turkey",
  gr:"greece", hr:"croatia", rs:"serbia", si:"slovenia", ba:"bosnia and herzegovina",
  me:"montenegro", mk:"north macedonia", by:"belarus", kz:"kazakhstan", ge:"georgia",
  am:"armenia", az:"azerbaijan", md:"moldova", lt:"lithuania", lv:"latvia", ee:"estonia",
  pt:"portugal", ie:"ireland", is:"iceland", lu:"luxembourg", mt:"malta", cy:"cyprus",
  mc:"monaco", va:"vatican", sm:"san marino", ad:"andorra", li:"liechtenstein",
  in:"india", pk:"pakistan", bd:"bangladesh", np:"nepal", lk:"sri lanka", af:"afghanistan",
  ir:"iran", iq:"iraq", sy:"syria", il:"israel", jo:"jordan", sa:"saudi arabia",
  ae:"united arab emirates", om:"oman", kw:"kuwait", qa:"qatar", bh:"bahrain", ye:"yemen",
  eg:"egypt", ma:"morocco", dz:"algeria", tn:"tunisia", ly:"libya", sd:"sudan",
  et:"ethiopia", ke:"kenya", ng:"nigeria", gh:"ghana", za:"south africa", mz:"mozambique",
  tz:"tanzania", ug:"uganda", zw:"zimbabwe", zm:"zambia", mw:"malawi", bw:"botswana",
  br:"brazil", ar:"argentina", cl:"chile", co:"colombia", pe:"peru", ve:"venezuela",
  mx:"mexico", cu:"cuba", do:"dominican republic", bo:"bolivia", ec:"ecuador",
  py:"paraguay", uy:"uruguay", gt:"guatemala", cr:"costa rica", hn:"honduras",
  ni:"nicaragua", pa:"panama", sv:"el salvador", sg:"singapore", th:"thailand",
  ph:"philippines", my:"malaysia", id:"indonesia", vn:"vietnam", kr:"south korea",
  kp:"north korea", tw:"taiwan", mn:"mongolia", mm:"myanmar",
};

async function numistaFetch(path: string, apiKey: string): Promise<any> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${NUMISTA_BASE}${path}${sep}api_key=${apiKey}`;
  const res = await fetch(url, { headers: { "Numista-API-Key": apiKey } });
  if (!res.ok) throw new Error(`Numista ${res.status}: ${await res.text()}`);
  return res.json();
}

function extractMintageForYear(coin: any, year: number): string | null {
  // Numista API v3: coin.issues[] → each issue has years[] and quantities[]
  const issues: any[] = coin.issues || [];
  for (const issue of issues) {
    const years: number[] = issue.years || [];
    if (years.includes(year)) {
      const qty = issue.mintage ?? issue.quantity;
      if (qty != null) return Number(qty).toLocaleString("uk-UA") + " шт";
    }
  }
  // fallback: try top-level mintages array
  const mintages: any[] = coin.mintages || [];
  const found = mintages.find((m: any) => m.year === year || String(m.year) === String(year));
  if (found?.mintage) return Number(found.mintage).toLocaleString("uk-UA") + " шт";
  return null;
}

// ── Numista sync (SSE) ────────────────────────────────────────────────────────
app.get("/api/numista-sync", async (req, res) => {
  const apiKey = process.env.NUMISTA_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "NUMISTA_API_KEY не встановлений у .env" });
    return;
  }

  const overwrite = req.query.overwrite === "true";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const sse = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  try {
    const allCoins = await dbGetCoinsForMintage();
    const isEmpty = (v: any) => !v || String(v).trim() === "" || v === "Невідомо";

    const targets = overwrite
      ? allCoins
      : allCoins.filter((c) =>
          isEmpty(c.weight) || isEmpty(c.diameter) || isEmpty(c.thickness) ||
          isEmpty(c.edge) || isEmpty(c.mintage)
        );

    sse({ type: "start", total: targets.length, skipped: allCoins.length - targets.length });

    let updated = 0, notFound = 0, errors = 0;

    for (let i = 0; i < targets.length; i++) {
      const coin = targets[i];
      sse({ type: "progress", current: i + 1, total: targets.length, title: coin.title, country: coin.country });

      try {
        // Build search query: denomination number + year
        const denomNum = (coin.denomination || "").replace(/[^\d.,]/g, "").trim() || coin.denomination || "";
        const year = Number(coin.year) || 0;
        const q = encodeURIComponent(`${denomNum} ${coin.year}`.trim());

        const searchData = await numistaFetch(`/types?q=${q}&lang=en&count=10`, apiKey);
        await delay(400);

        const results: any[] = searchData.types || searchData.coins || [];
        if (!results.length) { notFound++; sse({ type: "not_found", title: coin.title }); continue; }

        // Match by year range, prefer issuer matching country
        const isoCode = (coin.country || "").toLowerCase();
        const countryEn = Object.entries(ISO_TO_EN).find(([, en]) =>
          (coin.country || "").toLowerCase().includes(en.split(" ")[0])
        )?.[1] || "";

        let best = results.find((r: any) =>
          r.min_year <= year && r.max_year >= year &&
          (r.issuer?.name || "").toLowerCase().includes(countryEn.split(" ")[0])
        ) || results.find((r: any) => r.min_year <= year && r.max_year >= year)
          || results[0];

        if (!best) { notFound++; sse({ type: "not_found", title: coin.title }); continue; }

        // Fetch full details
        const detail = await numistaFetch(`/types/${best.id}?lang=en`, apiKey);
        await delay(400);

        const specs: Record<string, string> = {};

        if (overwrite || isEmpty(coin.weight))
          if (detail.weight?.value) specs.weight = `${detail.weight.value} ${detail.weight.unit || "г"}`;

        if (overwrite || isEmpty(coin.diameter))
          if (detail.size?.value) specs.diameter = `${detail.size.value} ${detail.size.unit || "мм"}`;

        if (overwrite || isEmpty(coin.thickness))
          if (detail.thickness?.value) specs.thickness = `${detail.thickness.value} ${detail.thickness.unit || "мм"}`;

        if (overwrite || isEmpty(coin.edge)) {
          const edgeType = detail.edge?.type || detail.edge?.description || "";
          if (edgeType) specs.edge = EDGE_UA[edgeType.toLowerCase()] || edgeType;
        }

        if (overwrite || isEmpty(coin.mintage)) {
          const mintage = extractMintageForYear(detail, year);
          if (mintage) specs.mintage = mintage;
        }

        if (Object.keys(specs).length) {
          await dbUpdateSpecs(coin.id, specs);
          updated++;
          sse({ type: "updated", title: coin.title, fields: Object.keys(specs) });
        } else {
          notFound++;
          sse({ type: "no_data", title: coin.title });
        }
      } catch (coinErr: any) {
        errors++;
        sse({ type: "error", title: coin.title, message: coinErr.message });
        await delay(1000);
      }
    }

    sse({ type: "done", updated, notFound, errors, total: targets.length });
  } catch (e: any) {
    sse({ type: "fatal", message: e.message });
  } finally {
    res.end();
  }
});

// Setup Vite development server or production static serving
async function startServer() {
  await initDb();
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CoinDetector API] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
