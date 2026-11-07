/**
 * Coin images as files on disk instead of base64 inside SQLite.
 *
 * The DB stores a reference `file:<hash>.<ext>`; the bytes live in IMAGES_DIR
 * (default ./images). Names are the SHA-256 of the content, so a file is never
 * overwritten with different bytes: identical photos share one file, and syncing to
 * the server only ever needs to *add* missing names (see deploy/push-db.ps1).
 *
 * Legacy values (data URLs / bare base64) are still understood everywhere, so an
 * unmigrated database keeps working.
 * @author Andrii (ATR) Tarasenko
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

export const FILE_REF_PREFIX = "file:";
const REF_RE = /^file:([0-9a-f]{32}\.[a-z0-9]{1,5})$/;
const DATA_URL_RE = /^data:image\/([\w.+-]+);base64,(.+)$/s;

const EXT_BY_SUBTYPE: Record<string, string> = { jpeg: "jpg", jpg: "jpg", png: "png", webp: "webp", gif: "gif", bmp: "bmp" };
const MIME_BY_EXT: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", bmp: "image/bmp" };

export const getImagesDir = (): string =>
  process.env.IMAGES_DIR ? path.resolve(process.env.IMAGES_DIR) : path.join(process.cwd(), "images");

export const isFileRef = (v: unknown): v is string => typeof v === "string" && REF_RE.test(v);

/** File name (`<hash>.<ext>`) of a ref, or null if the value is not a valid ref. */
export const refName = (v: unknown): string | null => {
  const m = typeof v === "string" ? v.match(REF_RE) : null;
  return m ? m[1] : null;
};

/** Absolute path of a ref's file, or null if the value is not a ref. */
export const refPath = (v: unknown): string | null => {
  const name = refName(v);
  return name ? path.join(getImagesDir(), name) : null;
};

export const mimeForRef = (v: unknown): string => {
  const ext = (refName(v) || "").split(".").pop() || "";
  return MIME_BY_EXT[ext] || "application/octet-stream";
};

/** Decodes a data URL or bare base64 (treated as JPEG, as the app always did). */
export const decodeInlineImage = (v: string): { buf: Buffer; ext: string; mime: string } | null => {
  if (!v) return null;
  const m = v.match(DATA_URL_RE);
  const subtype = m ? m[1].toLowerCase() : "jpeg";
  const ext = EXT_BY_SUBTYPE[subtype] || subtype.replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
  const buf = Buffer.from(m ? m[2] : v, "base64");
  if (!buf.length) return null;
  return { buf, ext, mime: MIME_BY_EXT[ext] || `image/${subtype}` };
};

/**
 * Turns whatever the client sent into a DB value: "" stays "", an existing ref stays
 * as is, inline image data is written to disk (once per distinct content) and replaced
 * by its ref.
 */
export const storeImage = async (v: unknown): Promise<string> => {
  if (typeof v !== "string" || v === "") return "";
  if (isFileRef(v)) return v;
  const img = decodeInlineImage(v);
  if (!img) return "";
  const name = `${crypto.createHash("sha256").update(img.buf).digest("hex").slice(0, 32)}.${img.ext}`;
  const dir = getImagesDir();
  const dest = path.join(dir, name);
  if (!fs.existsSync(dest)) {
    await fs.promises.mkdir(dir, { recursive: true });
    // write-then-rename: a crash never leaves a truncated file under the final name
    const tmp = `${dest}.tmp-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;
    await fs.promises.writeFile(tmp, img.buf);
    try {
      await fs.promises.rename(tmp, dest);
    } catch (e) {
      await fs.promises.rm(tmp, { force: true });
      if (!fs.existsSync(dest)) throw e; // a concurrent writer of the same content is fine
    }
  }
  return FILE_REF_PREFIX + name;
};

/** Ref → data URL (for API consumers that expect inline images). Legacy values pass through. */
export const loadImageDataUrl = async (v: unknown): Promise<string> => {
  if (typeof v !== "string" || v === "") return "";
  const p = refPath(v);
  if (!p) return v;
  try {
    const buf = await fs.promises.readFile(p);
    return `data:${mimeForRef(v)};base64,${buf.toString("base64")}`;
  } catch {
    console.error(`[images] missing file for ${v}`);
    return "";
  }
};

export const IMAGE_FIELDS = ["image", "imageObverse", "imageReverse"] as const;

/** Replaces the image refs of a coin row with data URLs (returns a new object). */
export const hydrateCoinImages = async <T extends Record<string, any>>(coin: T | undefined): Promise<T | undefined> => {
  if (!coin) return coin;
  const out: any = { ...coin };
  const seen = new Map<string, string>(); // `image` usually duplicates `imageObverse` — read it once
  for (const f of IMAGE_FIELDS) {
    if (!(f in out)) continue;
    const v = out[f];
    if (!seen.has(v)) seen.set(v, await loadImageDataUrl(v));
    out[f] = seen.get(v);
  }
  return out;
};
