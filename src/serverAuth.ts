/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * @author Andrii (ATR) Tarasenko
 *
 * Minimal single-password auth for the public mirror.
 *
 * One shared secret in AUTH_PASSWORD unlocks the privileged features
 * (AI recognition, Services page, catalog editing). The session is a
 * signed, HttpOnly cookie — no extra runtime dependency, no server-side
 * session store. Changing AUTH_PASSWORD invalidates every issued cookie.
 *
 * If AUTH_PASSWORD is not set, login always fails and every guarded route
 * returns 401 — the site stays read-only for everyone.
 */

import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

const COOKIE_NAME = "numiscan_session";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const b64url = (b: Buffer) => b.toString("base64url");

const getPassword = () => process.env.AUTH_PASSWORD || "";
export const isAuthConfigured = () => getPassword().length > 0;

/** HMAC key: explicit AUTH_SECRET, else derived from the password. */
const signingKey = (): Buffer =>
  process.env.AUTH_SECRET
    ? crypto.createHash("sha256").update(String(process.env.AUTH_SECRET)).digest()
    : crypto.createHash("sha256").update("numiscan-session:" + getPassword()).digest();

const sign = (payload: string) =>
  b64url(crypto.createHmac("sha256", signingKey()).update(payload).digest());

/** Length-independent constant-time string compare. */
const safeEqual = (a: string, b: string) => {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
};

export const verifyPassword = (candidate: string) =>
  isAuthConfigured() && typeof candidate === "string" && safeEqual(candidate, getPassword());

/** `<payloadB64>.<sig>` where payload is JSON `{ exp }`. */
const makeToken = () => {
  const payload = b64url(Buffer.from(JSON.stringify({ exp: Date.now() + MAX_AGE_MS })));
  return `${payload}.${sign(payload)}`;
};

const tokenValid = (token: string | undefined): boolean => {
  if (!token || !isAuthConfigured()) return false;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
};

const readCookie = (req: Request, name: string): string | undefined => {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
};

const cookieIsSecure = (req: Request) =>
  req.secure || (req.headers["x-forwarded-proto"] || "").toString().split(",")[0].trim() === "https";

export const issueSession = (req: Request, res: Response) => {
  const attrs = [
    `${COOKIE_NAME}=${makeToken()}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(MAX_AGE_MS / 1000)}`,
  ];
  if (cookieIsSecure(req)) attrs.push("Secure");
  res.setHeader("Set-Cookie", attrs.join("; "));
};

export const clearSession = (req: Request, res: Response) => {
  const attrs = [`${COOKIE_NAME}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (cookieIsSecure(req)) attrs.push("Secure");
  res.setHeader("Set-Cookie", attrs.join("; "));
};

export const isAuthed = (req: Request) => tokenValid(readCookie(req, COOKIE_NAME));

/** Express guard for privileged routes. */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (isAuthed(req)) return next();
  res.status(401).json({ error: "Потрібна автентифікація" });
};
