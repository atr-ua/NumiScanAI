/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * @author Andrii (ATR) Tarasenko
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import dotenv from "dotenv";
import { initDb, dbGetCoins, dbGetCoin, dbSaveCoin, dbDeleteCoin, dbReorderCoins, dbGetCoinsForMintage, dbUpdateSpecs, dbGetCoinsByIds, dbGetNumistaQuota, dbSetNumistaQuota } from "./src/db.js";
import { generateCatalogPdf } from "./src/pdfExport.js";
import { requireAuth, isAuthed, isAuthConfigured, verifyPassword, issueSession, clearSession } from "./src/serverAuth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Behind nginx: trust X-Forwarded-* so req.secure / client IP are accurate
app.set("trust proxy", 1);

// Increase payload bounds for base64 image uploads
app.use(express.json({ limit: "20mb" }));

// ── Auth (single shared password → signed HttpOnly cookie) ────────────────────
if (!isAuthConfigured()) {
  console.warn("[auth] AUTH_PASSWORD is not set — recognition, Services and editing are locked for everyone.");
}

// Crude brute-force brake: escalating delay per client IP after failed logins
const loginFails = new Map<string, { n: number; ts: number }>();

app.get("/api/auth", (req, res) => {
  res.json({ authed: isAuthed(req), configured: isAuthConfigured() });
});

app.post("/api/login", async (req, res) => {
  const ip = req.ip || "?";
  const rec = loginFails.get(ip);
  if (rec && Date.now() - rec.ts < 15 * 60_000 && rec.n >= 2) {
    await new Promise((r) => setTimeout(r, Math.min(2000, 250 * rec.n)));
  }
  if (!isAuthConfigured()) return res.status(503).json({ error: "Автентифікація не налаштована на сервері (AUTH_PASSWORD)" });
  if (!verifyPassword(req.body?.password)) {
    loginFails.set(ip, { n: (rec?.n ?? 0) + 1, ts: Date.now() });
    return res.status(401).json({ error: "Невірний пароль" });
  }
  loginFails.delete(ip);
  issueSession(req, res);
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  clearSession(req, res);
  res.json({ ok: true });
});

// Safe environment key handling
const getApiKey      = () => process.env.GEMINI_API_KEY || "";
const getOpenAiKey   = () => process.env.OPENAI_API_KEY || "";
const getLmStudioUrl = (reqUrl?: string) =>
  (reqUrl || process.env.LM_STUDIO_URL || "http://localhost:1234").replace(/\/$/, "");
const getOllamaUrl   = (reqUrl?: string) =>
  (reqUrl || process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");

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
app.post("/api/coins", requireAuth, async (req, res) => {
  try {
    const saved = await dbSaveCoin(req.body);
    res.json(saved);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// API: Swap obverse and reverse images for a coin
app.post("/api/coins/:id/swap-images", requireAuth, async (req, res) => {
  try {
    const coin = await dbGetCoin(req.params.id);
    if (!coin) return res.status(404).json({ error: "Not found" });
    const saved = await dbSaveCoin({
      ...coin,
      imageObverse: coin.imageReverse || "",
      imageReverse: coin.imageObverse || "",
      updatedAt: new Date().toISOString(),
    });
    res.json(saved);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// API: Reorder coins by assigning vis_id 1..N
app.post("/api/coins/reorder", requireAuth, async (req, res) => {
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
app.delete("/api/coins/:id", requireAuth, async (req, res) => {
  try {
    await dbDeleteCoin(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// API: Batch-update mintage for all coins via Gemini (text-only, no images)
app.post("/api/batch-mintage", requireAuth, async (req, res) => {
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

// API: List available Gemini models that support generateContent
app.get("/api/gemini-models", requireAuth, async (_req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY відсутній" });

  try {
    const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
    const pager = await ai.models.list();

    const models: { id: string; displayName: string; description: string }[] = [];
    for await (const m of pager) {
      const id = (m.name || "").replace("models/", "");
      // Keep only text/multimodal gemini models suitable for coin recognition
      const skip = ["embed", "imagen", "veo", "tts", "aqa", "audio", "live", "robotics", "computer-use", "-image"];
      if (id.startsWith("gemini") && !skip.some(s => id.includes(s))) {
        models.push({
          id,
          displayName: m.displayName || id,
          description: m.description || "",
        });
      }
    }

    res.json(models);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Shared prompt builders for coin recognition (used by both Gemini and OpenAI)
const COIN_JSON_FIELDS = `{
  "visualEvidence": "СПОЧАТКУ заповни це поле. Опиши лише те, що РЕАЛЬНО видно на монеті: легенда аверсу дослівно (оригінальний напис + транслітерація/переклад), легенда реверсу дослівно, дата так, як вона зображена, знак монетного двору, портрет/герб/головний малюнок аверсу й реверсу, мова та абетка написів. Це твої спостереження, а не дані з каталогу.",
  "title": "Назва монети, напр. '2 гривні (2018)'",
  "denomination": "Номінал, напр. '2 гривні'",
  "country": "Країна, напр. 'Україна'",
  "year": "Рік карбування або 'Невідомо' (не вгадуй, якщо дата не читається)",
  "metal": "Метал/сплав, напр. 'Нейзильбер'",
  "weight": "Вага з каталогу, напр. '4.0 г', або 'Невідомо', якщо тип монети не встановлено впевнено",
  "diameter": "Діаметр з каталогу, напр. '22.0 мм', або 'Невідомо', якщо тип монети не встановлено впевнено",
  "estimatedValue": "Ринкова вартість у UAH, напр. '10–50 грн', або 'Невідомо', якщо тип монети не встановлено впевнено",
  "mintage": "Тираж з каталогу, напр. '1 000 000 шт', або 'Невідомо'",
  "thickness": "Товщина з каталогу, напр. '1.8 мм', або 'Невідомо'",
  "edge": "Гурт: 'гладкий'/'рифлений'/'написовий'/'сегментований'/'комбінований' або 'Невідомо'",
  "rarity": "'Звичайна'/'Нечаста'/'Рідкісна'/'Колекційна' або 'Не визначено' (орієнтовно)",
  "grade": "'VF'/'XF'/'UNC' або 'Не визначено', якщо стан оцінити неможливо (орієнтовно)",
  "historicalContext": "Нумізматичний опис українською мовою. ЯКЩО тип монети впевнено визначено — 4–6 речень, що охоплюють: (1) історичний та політичний контекст випуску — епоха, держава, правитель або подія; (2) детальний опис зображень аверсу й реверсу, символіка гербів, написів, орнаментів; (3) обставини карбування — обігова, ювілейна, пам'ятна, пробна; серія якщо є; (4) відомі різновиди, помилки карбування, особливості тиражу, причини колекційного попиту; (5) сучасна колекційна цінність. ЯКЩО монету впевнено не визначено — 1–2 речення лише про те, що реально видно, без домислів.",
  "imagesSwapped": "true якщо перше фото — реверс, false — інакше"
}`;

const COIN_ACCURACY_RULES = `Правила якості даних (дотримуйся суворо):
- Спочатку заповни visualEvidence: дослівно прочитай усі написи, дату та знак монетного двору — і лише потім визначай монету.
- Чітко розділяй те, що ВИДНО на монеті (країна, номінал, рік, легенди, знак д/в), і те, що береться З КАТАЛОГУ (weight, diameter, thickness, mintage, estimatedValue).
- Якщо тип монети не встановлено впевнено — постав "Невідомо" в полях weight, diameter, thickness, mintage, estimatedValue. НІКОЛИ не підставляй правдоподібні числа замість справжніх даних каталогу.
- Якщо рік не читається — "Невідомо". Не вгадуй.
- grade і rarity орієнтовні; якщо стан чи рідкість оцінити неможливо — "Не визначено".
- Краще коротший historicalContext, ніж вигадані факти. Пиши лише те, що справді відомо про цей тип монети.`;

const buildCoinSystemPrompt = (isRefinement: boolean) =>
  isRefinement
    ? `You are an expert world coin analyst and professional numismatist with deep knowledge of NGC, PCGS, Krause Standard Catalog, and national mint records. The user has provided a correction to your previous coin identification. Update the coin data based on this correction, re-deriving all dependent fields (geometry, value, rarity, historical context). For historicalContext write a detailed paragraph (4–6 sentences when the coin type is confidently identified, otherwise 1–2 sentences with no speculation) covering historical background, imagery description, minting circumstances, and collector significance. Respond with structured JSON only, matching this schema:\n${COIN_JSON_FIELDS}\n${COIN_ACCURACY_RULES}\nAll text fields must be in Ukrainian.`
    : `You are an expert world coin analyst and professional numismatist with encyclopedic knowledge of world coinage across all eras and countries. You have access to NGC, PCGS, Krause Standard Catalog of World Coins, and national mint databases. Identify the coin from the provided image(s) with maximum precision. Fill visualEvidence first — transcribe the legends, date and mint mark verbatim — then identify the coin. For the historicalContext field, write 4–6 sentences when the coin type is confidently identified, otherwise 1–2 sentences describing only what is visible, with no speculation; when detailed, cover the historical and political context of issuance, a thorough description of the obverse and reverse imagery and symbolism, whether the coin is circulating or commemorative, any notable varieties or minting peculiarities, and its current collector significance. Respond with ONLY a valid JSON object matching this schema:\n${COIN_JSON_FIELDS}\n${COIN_ACCURACY_RULES}\nAll text fields must be in Ukrainian.`;

const COIN_VISUAL_HINTS = `Examine carefully: country name, denomination value, year of minting, ruler portrait or national emblem, mint mark, inscription language and script, edge design, and any special commemorative text. Cross-reference both sides to confirm identification. If ambiguous, choose the most likely candidate based on numismatic visual elements.`;

const buildCoinUserPrompt = (isRefinement: boolean, hasBothSides: boolean, correction?: string, previousResult?: object) =>
  isRefinement
    ? `You previously identified this coin:\n${JSON.stringify(previousResult, null, 2)}\n\nUser correction: "${correction}"\n\nRe-examine the image(s) with this correction in mind. Update ALL fields affected by the correction (e.g. if denomination changes, also update weight, diameter, estimatedValue, rarity, historicalContext). Keep correct fields unchanged. All text MUST be in Ukrainian.`
    : hasBothSides
      ? `Two images of the same coin are provided: the first is the obverse (heads), the second is the reverse (tails). Use BOTH images together to identify the coin as precisely as possible. ${COIN_VISUAL_HINTS} Also check whether the images are actually in the correct order — if the first image appears to be the reverse and the second the obverse, set imagesSwapped=true. All text fields MUST be in Ukrainian.`
      : `Identify this coin from the image. ${COIN_VISUAL_HINTS} All text fields MUST be in Ukrainian.`;

// API: Fetch available models from LM Studio
app.get("/api/lm-studio-models", requireAuth, async (req, res) => {
  const url   = getLmStudioUrl(req.query.url as string);
  const token = (req.query.token as string) || "";
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const r = await fetch(`${url}/api/v1/models`, { headers });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
    const data = await r.json();
    const list = data.models || data.data || [];
    const models = list.map((m: any) => ({
      id:          `lms:${m.key || m.id}`,
      displayName: m.display_name || m.key || m.id,
    }));
    res.json(models);
  } catch (e: any) {
    res.status(500).json({ error: `Не вдалося підключитися до LM Studio (${url}): ${e.message}` });
  }
});

// API: Fetch available models from Ollama
app.get("/api/ollama-models", requireAuth, async (req, res) => {
  const url = getOllamaUrl(req.query.url as string);
  try {
    const r = await fetch(`${url}/api/tags`);
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
    const data = await r.json();
    const models = (data.models || []).map((m: any) => ({
      id:          `oll:${m.name}`,
      displayName: m.name,
      size:        m.size ? `${(m.size / 1e9).toFixed(1)} GB` : "",
    }));
    res.json(models);
  } catch (e: any) {
    res.status(500).json({ error: `Не вдалося підключитися до Ollama (${url}): ${e.message}` });
  }
});

// API: Recognize coin via Gemini or OpenAI (auto-detected by model prefix)
app.post("/api/recognize-coin", requireAuth, async (req, res) => {
  const { image, imageReverse, correction, previousResult, model, lmStudioUrl, lmStudioToken, ollamaUrl } = req.body;
  const modelName: string = model || "gemini-2.0-flash";
  if (!image) return res.status(400).json({ error: "Зображення не передано" });

  const isRefinement = !!(correction && previousResult);
  const base64Match  = image.match(/^data:image\/\w+;base64,(.+)$/);
  const cleanBase64  = base64Match ? base64Match[1] : image;

  const isLMStudio = modelName.startsWith("lms:");
  const isOllama   = modelName.startsWith("oll:");
  const isOpenAI   = !isLMStudio && !isOllama && (modelName.startsWith("gpt-") || /^o\d/.test(modelName));

  // ── LM Studio path ────────────────────────────────────────────────────────
  if (isLMStudio) {
    const studioUrl  = getLmStudioUrl(lmStudioUrl);
    const realModel  = modelName.slice(4); // strip "lms:" prefix
    try {
      const lmClient = new OpenAI({ baseURL: `${studioUrl}/v1`, apiKey: lmStudioToken || "lm-studio" });

      const userContent: OpenAI.ChatCompletionContentPart[] = [
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${cleanBase64}`, detail: "high" } },
      ];

      if (imageReverse) {
        const revMatch = (imageReverse as string).match(/^data:image\/\w+;base64,(.+)$/);
        const cleanRev = revMatch ? revMatch[1] : imageReverse;
        userContent.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${cleanRev}`, detail: "high" } });
      }

      const hasBothSides = userContent.length > 1;
      userContent.push({
        type: "text",
        text: buildCoinUserPrompt(isRefinement, hasBothSides, correction, previousResult)
          + `\n\nПоверни ТІЛЬКИ JSON-об'єкт з такими полями:\n${COIN_JSON_FIELDS}\nБез markdown, без пояснень — лише JSON.`,
      });

      const response = await lmClient.chat.completions.create({
        model: realModel,
        messages: [
          { role: "system", content: buildCoinSystemPrompt(isRefinement) + "\nВідповідай ВИКЛЮЧНО у форматі JSON-об'єкта. Без markdown, без пояснень." },
          { role: "user",   content: userContent },
        ],
        response_format: { type: "text" },
        max_tokens: 2500,
        temperature: 0.1,
      });

      const raw     = response.choices[0].message.content || "{}";
      const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      return res.json(JSON.parse(jsonStr));
    } catch (error: any) {
      console.error("Помилка LM Studio API:", error);
      return res.status(500).json({ error: error.message || "Помилка LM Studio API" });
    }
  }

  // ── Ollama path ───────────────────────────────────────────────────────────
  if (isOllama) {
    const studioUrl = getOllamaUrl(ollamaUrl);
    const realModel = modelName.slice(4); // strip "oll:"
    try {
      const ollClient = new OpenAI({ baseURL: `${studioUrl}/v1`, apiKey: "ollama" });

      const userContent: OpenAI.ChatCompletionContentPart[] = [
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${cleanBase64}`, detail: "high" } },
      ];
      if (imageReverse) {
        const revMatch = (imageReverse as string).match(/^data:image\/\w+;base64,(.+)$/);
        const cleanRev = revMatch ? revMatch[1] : imageReverse;
        userContent.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${cleanRev}`, detail: "high" } });
      }
      const hasBothSides = userContent.length > 1;
      userContent.push({
        type: "text",
        text: buildCoinUserPrompt(isRefinement, hasBothSides, correction, previousResult)
          + `\n\nПоверни ТІЛЬКИ JSON-об'єкт з полями:\n${COIN_JSON_FIELDS}\nБез markdown, без пояснень — лише JSON.`,
      });

      const response = await ollClient.chat.completions.create({
        model: realModel,
        messages: [
          { role: "system", content: buildCoinSystemPrompt(isRefinement) + "\nВідповідай ВИКЛЮЧНО у форматі JSON-об'єкта. Без markdown, без пояснень." },
          { role: "user",   content: userContent },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2500,
        temperature: 0.1,
      });

      const raw     = response.choices[0].message.content || "{}";
      const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      return res.json(JSON.parse(jsonStr));
    } catch (error: any) {
      console.error("Помилка Ollama API:", error);
      return res.status(500).json({ error: error.message || "Помилка Ollama API" });
    }
  }

  // ── OpenAI path ───────────────────────────────────────────────────────────
  if (isOpenAI) {
    const openaiKey = getOpenAiKey();
    if (!openaiKey) return res.status(500).json({ error: "OPENAI_API_KEY відсутній у .env" });

    try {
      const openai = new OpenAI({ apiKey: openaiKey });

      const userContent: OpenAI.ChatCompletionContentPart[] = [
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${cleanBase64}`, detail: "high" } },
      ];

      if (imageReverse) {
        const revMatch = (imageReverse as string).match(/^data:image\/\w+;base64,(.+)$/);
        const cleanRev = revMatch ? revMatch[1] : imageReverse;
        userContent.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${cleanRev}`, detail: "high" } });
      }

      const hasBothSides = userContent.length > 1;
      userContent.push({ type: "text", text: buildCoinUserPrompt(isRefinement, hasBothSides, correction, previousResult) });

      const coinSchema = {
        type: "object",
        properties: {
          visualEvidence:  { type: "string", description: "СПОЧАТКУ: дослівні легенди аверсу й реверсу (оригінал + переклад), дата як зображена, знак монетного двору, опис малюнків аверсу/реверсу. Лише спостереження, не дані з каталогу." },
          title:           { type: "string", description: "Назва монети, напр. '2 гривні (2018)'" },
          denomination:    { type: "string", description: "Номінал, напр. '2 гривні'" },
          country:         { type: "string", description: "Країна походження українською, напр. 'Україна'" },
          year:            { type: "string", description: "Рік карбування або 'Невідомо' (не вгадувати)" },
          metal:           { type: "string", description: "Метал/сплав українською, напр. 'Нейзильбер'" },
          weight:          { type: "string", description: "Вага з каталогу, напр. '4.0 г', або 'Невідомо' якщо тип не встановлено впевнено" },
          diameter:        { type: "string", description: "Діаметр з каталогу, напр. '22.0 мм', або 'Невідомо' якщо тип не встановлено впевнено" },
          estimatedValue:  { type: "string", description: "Ринкова вартість у UAH, напр. '10–50 грн', або 'Невідомо' якщо тип не встановлено впевнено" },
          mintage:         { type: "string", description: "Тираж з каталогу, напр. '1 000 000 шт', або 'Невідомо'" },
          thickness:       { type: "string", description: "Товщина з каталогу, напр. '1.8 мм', або 'Невідомо'" },
          edge:            { type: "string", enum: ["гладкий", "рифлений", "написовий", "сегментований", "комбінований", "Невідомо"], description: "Гурт" },
          rarity:          { type: "string", enum: ["Звичайна", "Нечаста", "Рідкісна", "Колекційна", "Не визначено"], description: "Рідкість (орієнтовно)" },
          grade:           { type: "string", enum: ["VF", "XF", "UNC", "Не визначено"], description: "Стан збереження (орієнтовно; 'Не визначено' якщо оцінити неможливо)" },
          historicalContext: { type: "string", description: "Опис монети, символіки — українською мовою" },
          imagesSwapped:   { type: "boolean", description: "true якщо перше фото є реверсом" },
        },
        required: ["visualEvidence", "title", "denomination", "country", "year", "metal", "weight", "diameter", "estimatedValue", "mintage", "thickness", "edge", "rarity", "grade", "historicalContext", "imagesSwapped"],
        additionalProperties: false,
      };

      const response = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: "system", content: buildCoinSystemPrompt(isRefinement) },
          { role: "user",   content: userContent },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "coin_identification", strict: true, schema: coinSchema },
        },
        // gpt-4* accept a custom temperature; gpt-5.x / o-series only run at default — omit there
        temperature: /^gpt-4/.test(modelName) ? 0 : undefined,
        max_tokens: 2500,
      });

      const parsedJson = JSON.parse(response.choices[0].message.content || "{}");
      return res.json(parsedJson);
    } catch (error: any) {
      console.error("Помилка OpenAI API:", error);
      return res.status(500).json({ error: error.message || "Помилка OpenAI API" });
    }
  }

  // ── Gemini path ───────────────────────────────────────────────────────────
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(500).json({
      error: "Ключ доступу API (GEMINI_API_KEY) відсутній. Будь ласка, введіть його в бічній панелі Settings > Secrets."
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });

    const imageParts: { inlineData: { mimeType: string; data: string } }[] = [
      { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
    ];

    if (imageReverse) {
      const revMatch = (imageReverse as string).match(/^data:image\/\w+;base64,(.+)$/);
      const cleanRev = revMatch ? revMatch[1] : imageReverse;
      imageParts.push({ inlineData: { mimeType: "image/jpeg", data: cleanRev } });
    }

    const hasBothSides = imageParts.length === 2;
    const textPart = { text: buildCoinUserPrompt(isRefinement, hasBothSides, correction, previousResult) };

    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: [...imageParts, textPart] },
      config: {
        systemInstruction: buildCoinSystemPrompt(isRefinement),
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            visualEvidence: { type: Type.STRING },
            title:          { type: Type.STRING },
            denomination:   { type: Type.STRING },
            country:        { type: Type.STRING },
            year:           { type: Type.STRING },
            metal:          { type: Type.STRING },
            weight:         { type: Type.STRING },
            diameter:       { type: Type.STRING },
            estimatedValue: { type: Type.STRING },
            mintage:        { type: Type.STRING },
            thickness:      { type: Type.STRING },
            edge:           { type: Type.STRING, enum: ["гладкий", "рифлений", "написовий", "сегментований", "комбінований", "Невідомо"] },
            rarity:         { type: Type.STRING, enum: ["Звичайна", "Нечаста", "Рідкісна", "Колекційна", "Не визначено"] },
            grade:          { type: Type.STRING, enum: ["VF", "XF", "UNC", "Не визначено"] },
            historicalContext: { type: Type.STRING },
            imagesSwapped:  { type: Type.BOOLEAN },
          },
          required: ["visualEvidence", "title", "denomination", "country", "year", "metal", "weight", "diameter", "estimatedValue", "rarity", "grade", "historicalContext"],
        },
      },
    });

    const parsedJson = JSON.parse(response.text || "{}");
    res.json(parsedJson);
  } catch (error: any) {
    console.error("Помилка Gemini API:", error);
    res.status(500).json({ error: error.message || "Помилка Gemini API" });
  }
});

// ── Numista helpers ───────────────────────────────────────────────────────────

const NUMISTA_BASE = "https://api.numista.com/api/v3";
const NUMISTA_SEARCH = "/types";   // coin type search (specs: weight, size, etc.)
const NUMISTA_MONTHLY_LIMIT = 2000;

const EDGE_UA: Record<string, string> = {
  plain: "гладкий", smooth: "гладкий",
  reeded: "рифлений", milled: "рифлений",
  lettered: "написовий", inscribed: "написовий",
  segmented: "сегментований", "segmented reeding": "сегментований рифлений",
  ornamented: "орнаментований", grooved: "рифлений",
  "plain and reeded sections": "комбінований",
};

// In-memory cache of the current month's Numista request count, backed by app_settings
// so it survives server restarts. Numista's plan resets on the calendar month, not on a
// rolling 30-day window, so the key is just "YYYY-MM".
let numistaQuotaState: { month: string; count: number } | null = null;

function currentQuotaMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

async function bumpNumistaQuota(): Promise<{ month: string; count: number }> {
  const month = currentQuotaMonth();
  if (!numistaQuotaState) numistaQuotaState = await dbGetNumistaQuota();
  if (numistaQuotaState.month !== month) numistaQuotaState = { month, count: 0 };
  numistaQuotaState.count += 1;
  await dbSetNumistaQuota(month, numistaQuotaState.count);
  return numistaQuotaState;
}

async function readNumistaQuota(): Promise<{ month: string; count: number }> {
  const month = currentQuotaMonth();
  if (!numistaQuotaState) numistaQuotaState = await dbGetNumistaQuota();
  return numistaQuotaState.month === month ? numistaQuotaState : { month, count: 0 };
}

async function numistaFetch(path: string, apiKey: string): Promise<any> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${NUMISTA_BASE}${path}${sep}api_key=${apiKey}`;
  const res = await fetch(url, { headers: { "Numista-API-Key": apiKey } });
  await bumpNumistaQuota(); // every call — success or not — counts against the plan's monthly quota
  if (!res.ok) throw new Error(`Numista ${res.status}: ${await res.text()}`);
  return res.json();
}

const translateCache = new Map<string, string>();

// Free Google Translate endpoint (no key needed) — translates UA coin/country names
// to English so the Numista query text matches its English-language catalogue.
async function translateToEnglish(text: string): Promise<string> {
  const trimmed = (text || "").trim();
  if (!trimmed) return "";
  const cached = translateCache.get(trimmed);
  if (cached) return cached;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=uk&tl=en&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url);
    if (!res.ok) return trimmed;
    const data = await res.json();
    const translated = ((data?.[0] || []) as any[]).map((chunk) => chunk[0]).join("").trim();
    const result = translated || trimmed;
    translateCache.set(trimmed, result);
    return result;
  } catch {
    return trimmed;
  }
}

// The Numista `issuer` filter expects its own internal country code (e.g. Ethiopia is
// "ethiopia_section", Bahamas is "bahamas"), not a slugified English name — those don't
// line up for many countries and the API 400s on an unrecognized code. We fetch the
// authoritative code list once (~11.8k entries, no pagination) and cache it in memory,
// then resolve by matching the first word of the (translated) country name.
type NumistaIssuer = { code: string; name: string; level: number };
let issuersCache: NumistaIssuer[] | null = null;
let issuersPromise: Promise<NumistaIssuer[]> | null = null;

function normalizeIssuerName(s: string): string {
  return s.toLowerCase().replace(/[,.]/g, "").trim();
}

async function loadNumistaIssuers(apiKey: string): Promise<NumistaIssuer[]> {
  if (issuersCache) return issuersCache;
  if (!issuersPromise) {
    issuersPromise = numistaFetch(`/issuers?lang=en`, apiKey).then((data) => {
      issuersCache = (data.issuers || []).map((i: any) => ({ code: i.code, name: i.name, level: i.level }));
      return issuersCache!;
    });
  }
  return issuersPromise;
}

async function resolveIssuerCode(countryEn: string, apiKey: string): Promise<string> {
  if (!countryEn) return "";
  const issuers = await loadNumistaIssuers(apiKey);
  const firstWord = normalizeIssuerName(countryEn).split(" ")[0];
  if (!firstWord) return "";
  const isMatch = (i: NumistaIssuer) => normalizeIssuerName(i.name).split(" ")[0] === firstWord;
  return issuers.find((i) => i.level === 1 && isMatch(i))?.code
      || issuers.find(isMatch)?.code
      || "";
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

// API: current month's Numista request usage (plan quota is 2000/calendar month).
app.get("/api/numista-quota", requireAuth, async (_req, res) => {
  const quota = await readNumistaQuota();
  res.json({ month: quota.month, count: quota.count, limit: NUMISTA_MONTHLY_LIMIT });
});

// Only one sync loop may run at a time — starting a new one aborts whatever's still
// running from a previous request (the client closing its EventSource, e.g. via "Стоп"
// or a page reload, does NOT stop the server-side loop on its own; see below).
let currentSync: { aborted: boolean } | null = null;

// ── Numista sync (SSE) ────────────────────────────────────────────────────────
app.get("/api/numista-sync", requireAuth, async (req, res) => {
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

  const sse = (data: object) => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`); };
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Cancel any previous run still looping in the background, then claim the slot.
  if (currentSync) currentSync.aborted = true;
  const sync = { aborted: false };
  currentSync = sync;
  req.on("close", () => { sync.aborted = true; });

  try {
    const allCoins = await dbGetCoinsForMintage();
    const isEmpty = (v: any) => !v || String(v).trim() === "" || v === "Невідомо";

    const targets = overwrite
      ? allCoins
      : allCoins.filter((c) =>
          isEmpty(c.weight) || isEmpty(c.diameter) || isEmpty(c.thickness) ||
          isEmpty(c.edge) || isEmpty(c.mintage)
        );

    const startQuota = await readNumistaQuota();
    sse({ type: "start", total: targets.length, skipped: allCoins.length - targets.length, quota: startQuota.count, quotaLimit: NUMISTA_MONTHLY_LIMIT });

    let updated = 0, notFound = 0, errors = 0;

    for (let i = 0; i < targets.length; i++) {
      if (sync.aborted) break;
      const coin = targets[i];
      sse({ type: "progress", current: i + 1, total: targets.length, title: coin.title, country: coin.country, quota: numistaQuotaState?.count });

      let queryLog = "";
      try {
        // Build search query. coin.year sometimes carries extra notes (e.g. "1977 (EE 1969)")
        // — take the first 4-digit number.
        const year = parseInt(String(coin.year).match(/\d{4}/)?.[0] || "0", 10);

        // Country → Numista issuer code (via translation + the authoritative /issuers list).
        const countryEn = await translateToEnglish(coin.country);
        const issuerCode = await resolveIssuerCode(countryEn, apiKey);

        // Primary query text is the bare denomination number + year — language/currency-name
        // agnostic, so it can't be broken by a mistranslated currency unit (e.g. Ethiopia's
        // "santim" mistranslating to "centimes", or Indonesia's "rupiah" to "rupees").
        const denomNum = (coin.denomination || "").match(/\d+(?:[.,]\d+)?/)?.[0] || "";
        const denomEn = (await translateToEnglish(coin.denomination)) || coin.denomination || "";
        const yearText = String(year || coin.year);
        const qNumeric = encodeURIComponent(`${denomNum} ${yearText}`.trim());
        const qTranslated = encodeURIComponent(`${denomEn} ${yearText}`.trim());
        const issuerParam = issuerCode ? `&issuer=${issuerCode}` : "";

        queryLog = `q="${denomNum} ${yearText}"${issuerCode ? ` issuer=${issuerCode}` : ""}`;
        let searchData = await numistaFetch(`/types?q=${qNumeric}${issuerParam}&lang=en&count=10`, apiKey);
        await delay(400);
        let results: any[] = searchData.types || searchData.coins || [];

        // Bare-number search can miss decimal/fractional denominations — retry with the
        // translated currency-name text (still scoped to the same issuer, if resolved).
        if (!results.length) {
          queryLog = `q="${denomEn} ${yearText}"${issuerCode ? ` issuer=${issuerCode}` : ""}`;
          searchData = await numistaFetch(`/types?q=${qTranslated}${issuerParam}&lang=en&count=10`, apiKey);
          await delay(400);
          results = searchData.types || searchData.coins || [];
        }

        // Issuer code may still be wrong/unresolved for this country — retry fully unrestricted.
        if (!results.length && issuerCode) {
          queryLog = `q="${denomEn} ${yearText}" (без issuer)`;
          searchData = await numistaFetch(`/types?q=${qTranslated}&lang=en&count=10`, apiKey);
          await delay(400);
          results = searchData.types || searchData.coins || [];
        }

        if (!results.length) { notFound++; sse({ type: "not_found", title: coin.title, query: queryLog }); continue; }

        // Prefer a result whose year range AND leading denomination number both match —
        // a same-year search often returns several denominations of the same country/set
        // (e.g. 1/5/10/25/50 santeem all issued in 1977).
        const countryFirstWord = countryEn.toLowerCase().split(" ")[0];
        const titleNum = (r: any) => String(r.title || "").match(/\d+(?:[.,]\d+)?/)?.[0] || "";
        const inYear = (r: any) => r.min_year <= year && r.max_year >= year;
        const matchesIssuer = (r: any) => !!countryFirstWord && (r.issuer?.name || "").toLowerCase().includes(countryFirstWord);

        let best = results.find((r: any) => inYear(r) && titleNum(r) === denomNum && matchesIssuer(r))
          || results.find((r: any) => inYear(r) && titleNum(r) === denomNum)
          || results.find((r: any) => inYear(r) && matchesIssuer(r))
          || results.find((r: any) => inYear(r))
          || results[0];

        if (!best) { notFound++; sse({ type: "not_found", title: coin.title, query: queryLog }); continue; }

        const match = `"${best.title}" · ${best.issuer?.name || "?"} · ${best.min_year}-${best.max_year}`;

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
          sse({ type: "updated", title: coin.title, fields: Object.keys(specs), query: queryLog, match });
        } else {
          notFound++;
          sse({ type: "no_data", title: coin.title, query: queryLog, match });
        }
      } catch (coinErr: any) {
        errors++;
        sse({ type: "error", title: coin.title, message: coinErr.message, query: queryLog });
        await delay(1000);
      }
    }

    if (!sync.aborted) {
      sse({ type: "done", updated, notFound, errors, total: targets.length, quota: numistaQuotaState?.count });
    }
  } catch (e: any) {
    sse({ type: "fatal", message: e.message });
  } finally {
    if (currentSync === sync) currentSync = null;
    res.end();
  }
});

// API: Generate PDF catalog for a given ordered list of coin IDs
app.post("/api/export/pdf", requireAuth, async (req, res) => {
  try {
    const { ids, withImages = true, filterSummary = "" } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids must be a non-empty array" });
    }
    const coins = await dbGetCoinsByIds(ids);
    const pdf   = await generateCatalogPdf(coins, withImages, filterSummary);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="catalog-${Date.now()}.pdf"`);
    res.setHeader("Content-Length", pdf.length);
    res.send(pdf);
  } catch (e: any) {
    console.error("[PDF export]", e.message);
    res.status(500).json({ error: e.message });
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
