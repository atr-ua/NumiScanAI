/**
 * Server-side PDF catalog generator using PDFKit.
 * Produces proper A4-format coin catalog with cover page and 3-column card grid.
 * Supports Cyrillic via system fonts; both obverse + reverse images per card.
 * @author Andrii (ATR) Tarasenko
 * @license Apache-2.0
 */

import PDFDocument from "pdfkit";
import fs from "fs";

// ── Font detection ─────────────────────────────────────────────────────────

interface FontPair { regular: string | null; bold: string | null }

function findFonts(candidates: [string, string][]): FontPair {
  for (const [r, b] of candidates) {
    if (fs.existsSync(r)) return { regular: r, bold: fs.existsSync(b) ? b : r };
  }
  return { regular: null, bold: null };
}

const findCyrillicFonts = () => findFonts([
  ["C:\\Windows\\Fonts\\arial.ttf",    "C:\\Windows\\Fonts\\arialbd.ttf"],
  ["C:\\Windows\\Fonts\\calibri.ttf",  "C:\\Windows\\Fonts\\calibrib.ttf"],
  ["C:\\Windows\\Fonts\\segoeui.ttf",  "C:\\Windows\\Fonts\\segoeuib.ttf"],
  ["/Library/Fonts/Arial.ttf",         "/Library/Fonts/Arial Bold.ttf"],
  ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
   "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"],
  ["/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
   "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"],
]);

const findSerifFonts = () => findFonts([
  ["C:\\Windows\\Fonts\\georgia.ttf",   "C:\\Windows\\Fonts\\georgiab.ttf"],
  ["C:\\Windows\\Fonts\\times.ttf",     "C:\\Windows\\Fonts\\timesbd.ttf"],
  ["/Library/Fonts/Georgia.ttf",        "/Library/Fonts/Georgia Bold.ttf"],
  ["/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
   "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"],
  ["/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
   "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"],
]);

// ── Metal accent colour ─────────────────────────────────────────────────────

function metalAccent(metal: string): string {
  const m = (metal || "").toLowerCase();
  if (m.includes("золот") || m.includes("gold"))    return "#D4AF37";
  if (m.includes("срібл") || m.includes("silver"))  return "#A8B8C0";
  if (m.includes("бімет"))                           return "#93C5FD";
  if (m.includes("бронза"))                          return "#CD7F32";
  if (m.includes("мідно-нікел"))                     return "#94A3B8";
  if (m.includes("мідь") || m.includes("мідн"))      return "#B87333";
  if (m.includes("латун"))                           return "#E8B84B";
  if (m.includes("сталь") || m.includes("залізо"))   return "#718096";
  if (m.includes("алюмін"))                          return "#A0AEC0";
  return "#94A3B8";
}

// ── Image helpers ───────────────────────────────────────────────────────────

function b64ToBuffer(raw: string): Buffer | null {
  try {
    if (!raw || raw.length < 20) return null;
    const match = raw.match(/^data:image\/\w+;base64,(.+)$/s);
    return Buffer.from(match ? match[1] : raw, "base64");
  } catch { return null; }
}

function drawCircleImg(
  doc: PDFKit.PDFDocument,
  buf: Buffer | null,
  cx: number, cy: number, r: number,
) {
  doc.circle(cx, cy, r).fillColor("#f1f5f9").fill();

  if (buf) {
    doc.save();
    try {
      doc.circle(cx, cy, r).clip();
      doc.image(buf, cx - r, cy - r, { width: r * 2, height: r * 2 });
    } catch { /* corrupt image — placeholder shows through */ }
    doc.restore();
  }

  doc.circle(cx, cy, r).lineWidth(0.5).strokeColor("#d1d9e0").stroke();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function gradeColor(grade: string): string {
  const g = (grade || "").toUpperCase().trim();
  if (/^(MS|PR|PF|GEM|UNC|SP)/.test(g)) return "#15803d";
  if (/^(AU|XF|EF)/.test(g))             return "#b45309";
  return "#1e293b";
}

function fitText(doc: PDFKit.PDFDocument, text: string, maxW: number): string {
  if (!text || doc.widthOfString(text) <= maxW) return text;
  let t = text;
  while (t.length > 1) {
    t = t.slice(0, -1);
    if (doc.widthOfString(t + "…") <= maxW) return t + "…";
  }
  return "…";
}

function setFont(doc: PDFKit.PDFDocument, bold: boolean, pair: FontPair) {
  if (pair.regular) {
    doc.font(bold && pair.bold ? pair.bold : pair.regular);
  } else {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica");
  }
}

// ── Card drawing ─────────────────────────────────────────────────────────────

function drawCard(
  doc: PDFKit.PDFDocument,
  fonts: FontPair,
  serif: FontPair,
  coin: Record<string, any>,
  x: number, y: number,
  cw: number, ch: number,
  withImages: boolean,
) {
  const accent = metalAccent(coin.metal || "");
  const RADIUS = 6;
  const PAD    = 10;
  const pw     = cw - PAD * 2;

  // Card: white rounded rect with subtle border
  doc.roundedRect(x, y, cw, ch, RADIUS)
     .fillColor("#ffffff")
     .strokeColor("#e2e8f0")
     .lineWidth(0.5)
     .fillAndStroke();

  // Price button dimensions (anchored to bottom)
  const valStr  = (coin.estimatedValue || "").trim();
  const hasValue = valStr && valStr !== "—";
  const BTN_H   = 20;
  const BTN_MB  = 9;   // margin from card bottom
  const maxDataY = y + ch - (hasValue ? BTN_H + BTN_MB + 5 : PAD);

  let curY = y + PAD;

  // ── Images ─────────────────────────────────────────────────────────────────
  if (withImages) {
    const obvBuf  = b64ToBuffer(coin.imageObverse || coin.image || "");
    const revBuf  = b64ToBuffer(coin.imageReverse || "");
    const r       = 36;
    const imgGap  = 16;
    const imgMidY = curY + r;
    const leftCx  = x + cw / 2 - r - imgGap / 2;
    const rightCx = x + cw / 2 + r + imgGap / 2;

    drawCircleImg(doc, obvBuf,  leftCx,  imgMidY, r);
    drawCircleImg(doc, revBuf,  rightCx, imgMidY, r);

    // AV / RV labels
    setFont(doc, false, fonts);
    doc.fontSize(6.5).fillColor(accent);
    doc.text("AV", leftCx  - 12, imgMidY + r + 4, { width: 24, align: "center", lineBreak: false });
    doc.text("RV", rightCx - 12, imgMidY + r + 4, { width: 24, align: "center", lineBreak: false });

    curY += r * 2 + 14 + 5;  // circles + label row + gap

    // Divider
    doc.moveTo(x + PAD, curY).lineTo(x + cw - PAD, curY)
       .lineWidth(0.4).strokeColor("#edf0f4").stroke();
    curY += 6;
  }

  // ── Title ──────────────────────────────────────────────────────────────────
  setFont(doc, true, fonts);
  doc.fontSize(9).fillColor("#0f172a")
     .text(coin.title || "", x + PAD, curY, { width: pw, align: "center", lineBreak: false });
  curY += 14;

  // Divider
  doc.moveTo(x + PAD, curY).lineTo(x + cw - PAD, curY)
     .lineWidth(0.4).strokeColor("#edf0f4").stroke();
  curY += 6;

  // ── Data rows ──────────────────────────────────────────────────────────────
  const LABEL_SZ = 5.5;
  const VAL_SZ   = 7.5;
  const LABEL_H  = 6;
  const VAL_H    = 9;
  const ROW_GAP  = 4;
  const COL_GAP  = 8;
  const halfW    = (pw - COL_GAP) / 2;
  const col2X    = x + PAD + halfW + COL_GAP;

  // 2-column pairs: [leftLabel, leftKey, rightLabel, rightKey]
  const pairs: Array<[string, string, string, string]> = [
    ["КРАЇНА",  "country",      "РІК",  "year"],
    ["НОМІНАЛ", "denomination", "СТАН", "grade"],
  ];

  for (const [lbl1, key1, lbl2, key2] of pairs) {
    const v1 = String(coin[key1] ?? "").trim();
    const v2 = String(coin[key2] ?? "").trim();
    if (!v1 && !v2) continue;
    if (curY + LABEL_H + VAL_H > maxDataY) break;

    if (v1) {
      setFont(doc, false, fonts);
      doc.fontSize(LABEL_SZ).fillColor("#94a3b8")
         .text(lbl1, x + PAD, curY, { width: halfW, lineBreak: false, characterSpacing: 0.3 });
      const isGrade = key1 === "grade";
      setFont(doc, isGrade, isGrade ? fonts : (serif.regular ? serif : fonts));
      doc.fontSize(VAL_SZ).fillColor(isGrade ? gradeColor(v1) : "#0f172a")
         .text(fitText(doc, v1, halfW), x + PAD, curY + LABEL_H, { width: halfW, lineBreak: false });
    }

    if (v2) {
      setFont(doc, false, fonts);
      doc.fontSize(LABEL_SZ).fillColor("#94a3b8")
         .text(lbl2, col2X, curY, { width: halfW, lineBreak: false, characterSpacing: 0.3 });
      const isGrade = key2 === "grade";
      setFont(doc, isGrade, isGrade ? fonts : (serif.regular ? serif : fonts));
      doc.fontSize(VAL_SZ).fillColor(isGrade ? gradeColor(v2) : "#0f172a")
         .text(fitText(doc, v2, halfW), col2X, curY + LABEL_H, { width: halfW, lineBreak: false });
    }

    curY += LABEL_H + VAL_H + ROW_GAP;
  }

  // Full-width rows
  const fullRows: Array<[string, string]> = [
    ["МЕТАЛ",   "metal"],
    ["ТИРАЖ",   "mintage"],
    ["ВАГА",    "weight"],
    ["ДІАМЕТР", "diameter"],
  ];

  for (const [lbl, key] of fullRows) {
    const val = String(coin[key] ?? "").trim();
    if (!val || val === "0") continue;
    if (curY + LABEL_H + VAL_H > maxDataY) break;

    setFont(doc, false, fonts);
    doc.fontSize(LABEL_SZ).fillColor("#94a3b8")
       .text(lbl, x + PAD, curY, { width: pw, lineBreak: false, characterSpacing: 0.3 });

    setFont(doc, false, serif.regular ? serif : fonts);
    doc.fontSize(VAL_SZ).fillColor("#0f172a")
       .text(fitText(doc, val, pw), x + PAD, curY + LABEL_H, { width: pw, lineBreak: false });

    curY += LABEL_H + VAL_H + ROW_GAP;
  }

  // ── Bottom price button ─────────────────────────────────────────────────────
  if (hasValue) {
    const btnY = y + ch - BTN_H - BTN_MB;
    doc.roundedRect(x + PAD, btnY, pw, BTN_H, 4).fillColor("#111827").fill();
    setFont(doc, true, fonts);
    doc.fontSize(9).fillColor(accent)
       .text(valStr, x + PAD, btnY + 6, { width: pw, align: "center", lineBreak: false });
  }
}

// ── Page header ──────────────────────────────────────────────────────────────

function drawPageHeader(
  doc: PDFKit.PDFDocument,
  fonts: FontPair,
  date: string,
  margin: number,
  pageW: number,
) {
  const hY = margin + 10;
  setFont(doc, false, fonts);
  doc.fontSize(7.5).fillColor("#94a3b8")
     .text("NumiScan AI", margin, hY, { lineBreak: false, characterSpacing: 0.3 })
     .text(`Каталог монет  ·  ${date}`, margin, hY, {
       width: pageW - 2 * margin, align: "right", lineBreak: false,
     });
  doc.moveTo(margin, hY + 14).lineTo(pageW - margin, hY + 14)
     .lineWidth(0.4).strokeColor("#e8edf2").stroke();
}

// ── Main export function ─────────────────────────────────────────────────────

export async function generateCatalogPdf(
  coins: Record<string, any>[],
  withImages: boolean,
  filterSummary = "",
): Promise<Buffer> {
  const fonts = findCyrillicFonts();
  const serif = findSerifFonts();

  const MARGIN = 20;
  const COLS   = 3;
  const GAP    = 8;
  const CARD_H = withImages ? 248 : 158;

  const PAGE_W    = 595.28;
  const PAGE_H    = 841.89;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const CARD_W    = (CONTENT_W - GAP * (COLS - 1)) / COLS;  // ≈ 179.5pt

  const HEADER_H = 35;
  const USABLE_H = PAGE_H - MARGIN * 2 - HEADER_H;
  const ROWS_PP  = Math.floor((USABLE_H + GAP) / (CARD_H + GAP));

  const date = new Date().toLocaleDateString("uk-UA", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      info: { Title: "Каталог монет — NumiScan AI", Author: "NumiScan AI" },
      autoFirstPage: true,
    });

    if (fonts.regular) doc.registerFont("R",  fonts.regular);
    if (fonts.bold)    doc.registerFont("B",  fonts.bold ?? fonts.regular!);
    if (serif.regular) doc.registerFont("SR", serif.regular);
    if (serif.bold)    doc.registerFont("SB", serif.bold ?? serif.regular!);
    const serifPair: FontPair = {
      regular: serif.regular ? "SR" : null,
      bold:    serif.bold    ? "SB" : null,
    };

    const chunks: Buffer[] = [];
    doc.on("data",  chunk => chunks.push(chunk));
    doc.on("end",   () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Cover Page ────────────────────────────────────────────────────────────
    const CW   = PAGE_W - 2 * MARGIN;
    const midX = PAGE_W / 2;

    doc.rect(0, 0, PAGE_W, PAGE_H).fill("#0a0f1e");
    doc.rect(0, 0, PAGE_W, 4).fill("#D4AF37");

    // Drawn diamond (no font-dependent Unicode symbol)
    const eyebrowY = 193;
    const dR = 4;
    doc.save();
    doc.translate(midX, eyebrowY);
    doc.moveTo(0, -dR).lineTo(dR * 1.3, 0).lineTo(0, dR).lineTo(-dR * 1.3, 0).closePath();
    doc.fillColor("#D4AF37").fillOpacity(0.7).fill();
    doc.restore();

    setFont(doc, false, fonts);
    doc.fontSize(9).fillColor("#D4AF37").fillOpacity(0.8)
       .text("NumiScan AI", MARGIN, eyebrowY + 8, {
         width: CW, align: "center", characterSpacing: 3, lineBreak: false,
       });

    setFont(doc, true, fonts);
    doc.fontSize(60).fillColor("#ffffff").fillOpacity(1)
       .text("КАТАЛОГ", MARGIN, 222, {
         width: CW, align: "center", characterSpacing: -1, lineBreak: false,
       });
    setFont(doc, false, fonts);
    doc.fontSize(20).fillColor("#ffffff").fillOpacity(0.35)
       .text("МОНЕТ", MARGIN, 287, {
         width: CW, align: "center", characterSpacing: 10, lineBreak: false,
       });

    doc.fillOpacity(1)
       .moveTo(midX - 28, 332).lineTo(midX + 28, 332)
       .lineWidth(1.5).strokeColor("#D4AF37").stroke();

    setFont(doc, true, fonts);
    doc.fontSize(13).fillColor("#D4AF37").fillOpacity(1)
       .text(`${coins.length} монет у каталозі`, MARGIN, 350, {
         width: CW, align: "center", lineBreak: false,
       });

    if (filterSummary.trim()) {
      setFont(doc, false, fonts);
      doc.fontSize(8).fillColor("#ffffff").fillOpacity(0.35)
         .text(filterSummary, MARGIN, 374, {
           width: CW, align: "center", lineBreak: false,
         });
    }

    setFont(doc, false, fonts);
    doc.fontSize(9).fillColor("#ffffff").fillOpacity(0.18)
       .text(`Дата генерації: ${date.toUpperCase()}`, MARGIN, PAGE_H - 68, {
         width: CW, align: "center", characterSpacing: 1, lineBreak: false,
       });

    doc.fontSize(7).fillColor("#ffffff").fillOpacity(0.1)
       .text("NumiScan AI — Нумізматичний каталог з AI-розпізнаванням монет", MARGIN, PAGE_H - 46, {
         width: CW, align: "center", characterSpacing: 1.5, lineBreak: false,
       });

    // ── Catalog Pages ─────────────────────────────────────────────────────────
    doc.addPage();
    doc.fillOpacity(1);
    drawPageHeader(doc, fonts, date, MARGIN, PAGE_W);

    let idx = 0;
    for (const coin of coins) {
      const posInPage = idx % (ROWS_PP * COLS);

      if (idx > 0 && posInPage === 0) {
        doc.addPage();
        doc.fillOpacity(1);
        drawPageHeader(doc, fonts, date, MARGIN, PAGE_W);
      }

      const col = posInPage % COLS;
      const row = Math.floor(posInPage / COLS);
      const cx  = MARGIN + col * (CARD_W + GAP);
      const cy  = MARGIN + HEADER_H + row * (CARD_H + GAP);

      drawCard(doc, fonts, serifPair, coin, cx, cy, CARD_W, CARD_H, withImages);
      idx++;
    }

    doc.end();
  });
}
