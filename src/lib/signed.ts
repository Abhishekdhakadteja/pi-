import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/server-env";

// Small signed tokens (HMAC-SHA256). Used for the patient's verified-phone cookie
// and for personal booking links in reminders. They cannot be forged without the secret.

function sign(payload: string): string {
  return createHmac("sha256", serverEnv.patientSessionSecret()).update(payload).digest("base64url");
}

export function makeToken(data: Record<string, unknown>, ttlSeconds: number): string {
  const body = Buffer.from(JSON.stringify({ ...data, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readToken<T extends Record<string, unknown>>(token: string | undefined | null): T | null {
  if (!token || typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as T & { exp: number };
    if (typeof data.exp !== "number" || data.exp < Date.now() / 1000) return null;
    return data;
  } catch {
    return null;
  }
}
