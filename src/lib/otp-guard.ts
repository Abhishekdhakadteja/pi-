import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { serverEnv } from "@/lib/server-env";

// Limits that stop one person (or a bot) from sending hundreds of paid OTP SMS ("SMS pumping").
// Each limit protects something different:
export const OTP_LIMITS = {
  phonePer10Min: 3, // one number cannot be flooded
  phonePerDay: 10,
  ipPer10Min: 5, // one phone/computer cannot try many numbers
  ipPerDay: 20,
  clinicPerHour: 40, // a clinic's page cannot be used to burn SMS credit
  clinicPerDay: 200,
} as const;

export type OtpCounts = { phone10: number; phoneDay: number; ip10: number; ipDay: number; clinicHour: number; clinicDay: number };

/** Pure check, easy to test: true when any limit is reached. */
export function otpLimited(c: OtpCounts, L = OTP_LIMITS): boolean {
  return (
    c.phone10 >= L.phonePer10Min ||
    c.phoneDay >= L.phonePerDay ||
    c.ip10 >= L.ipPer10Min ||
    c.ipDay >= L.ipPerDay ||
    c.clinicHour >= L.clinicPerHour ||
    c.clinicDay >= L.clinicPerDay
  );
}

/** The visitor's IP as seen by Netlify / Cloudflare, or null. */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return (
    h.get("x-nf-client-connection-ip") ??
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null
  );
}

/** One-way hash so the raw IP is never stored. */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(`ip:${ip}:${serverEnv.patientSessionSecret()}`).digest("hex").slice(0, 32);
}

// ---- Cloudflare Turnstile (free "are you human" check). Off until both keys are set. ----

export function turnstileSecret(): string | null {
  return process.env.TURNSTILE_SECRET_KEY?.trim() || null;
}

/** Verifies the widget token with Cloudflare. When Turnstile is not set up, always true. */
export async function turnstileOk(token: string | null | undefined, ip: string | null): Promise<boolean> {
  const secret = turnstileSecret();
  if (!secret) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8000),
    });
    const j = (await r.json()) as { success?: boolean };
    return j.success === true;
  } catch {
    // Cloudflare unreachable: do not lock patients out; the SMS limits above still apply.
    return true;
  }
}
