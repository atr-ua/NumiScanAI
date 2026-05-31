/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
