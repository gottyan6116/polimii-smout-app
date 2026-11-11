/**
 * デモ用の簡易ログイン（サーバー側のみ）。
 *
 * - ID・パスワードはコードに書かず、環境変数で設定する（DEMO_LOGIN_ID / DEMO_LOGIN_PASSWORD）。
 * - セッションは HMAC 署名つきの HttpOnly クッキー。署名鍵は DEMO_SESSION_SECRET（未設定時は ID とパスワードから導出）。
 * - 環境変数が未設定のときは、全画面をロックしたまま（ログイン不可）にする。
 *
 * 1アカウントの共有パスワード方式で、本番の認証（自治体ごとのアカウント、権限、監査ログ）の代わりにはならない。
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "smout_demo_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

interface AuthConfig {
  id: string;
  password: string;
  secret: string;
}

export function getAuthConfig(): AuthConfig | null {
  const id = process.env.DEMO_LOGIN_ID?.trim();
  const password = process.env.DEMO_LOGIN_PASSWORD;
  if (!id || !password) return null;
  const secret = process.env.DEMO_SESSION_SECRET || createHash("sha256").update(`${id}\u0000${password}\u0000smout-demo`).digest("hex");
  return { id, password, secret };
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** 長さに依存しない定数時間比較 */
function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

export function checkCredentials(id: string, password: string): "ok" | "invalid" | "unconfigured" {
  const cfg = getAuthConfig();
  if (!cfg) return "unconfigured";
  const idOk = safeEqual(id.trim().toLowerCase(), cfg.id.toLowerCase());
  const pwOk = safeEqual(password, cfg.password);
  return idOk && pwOk ? "ok" : "invalid";
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionToken(): string | null {
  const cfg = getAuthConfig();
  if (!cfg) return null;
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })).toString("base64url");
  return `${payload}.${sign(payload, cfg.secret)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  const cfg = getAuthConfig();
  if (!cfg || !token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  if (!safeEqual(sig, sign(payload, cfg.secret))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    return typeof exp === "number" && exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
