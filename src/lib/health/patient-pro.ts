import "server-only";
import { cookies } from "next/headers";
import { makeToken, readToken } from "@/lib/signed";
import { PATIENT_PRO } from "./pro-plan";

// Patient Pro access without accounts or a database:
// - The owner makes a signed activation link on /owner after payment (UPI/WhatsApp, or Razorpay later).
// - Opening the link stores a signed, expiring cookie on that phone.
// - A one-time 7-day trial cookie can be started from /health/pro.
// Tokens are HMAC-signed with PATIENT_SESSION_SECRET, so they cannot be forged or extended.

export const PRO_COOKIE = "ce_patient_pro";
const TRIAL_USED_COOKIE = "ce_patient_trial_used";
const DAY = 86400;

export type PatientPro = { status: "pro" | "trial" | "none"; until: string | null };

type ProToken = { k: "pp"; kind: "pro" | "trial"; p?: string; exp: number };

/** Activation code for one patient: valid to open for `months` months (+3 days grace). */
export function makeActivationCode(phoneLast4: string, months: number): string {
  const m = Math.min(24, Math.max(1, Math.floor(months)));
  return makeToken({ k: "pp", kind: "pro", p: phoneLast4.replace(/\D/g, "").slice(-4) }, (m * 30 + 3) * DAY);
}

export function readActivationCode(code: string): ProToken | null {
  const t = readToken<ProToken>(code.trim());
  return t && t.k === "pp" && (t.kind === "pro" || t.kind === "trial") ? t : null;
}

function isoDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toISOString().slice(0, 10);
}

export async function getPatientPro(): Promise<PatientPro> {
  const jar = await cookies();
  const t = readActivationCode(jar.get(PRO_COOKIE)?.value ?? "");
  if (!t) return { status: "none", until: null };
  return { status: t.kind, until: isoDate(t.exp) };
}

export async function trialUsed(): Promise<boolean> {
  return (await cookies()).get(TRIAL_USED_COOKIE)?.value === "1";
}

const cookieOpts = (maxAge: number) => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge });

/** Stores a valid code on this phone. Returns false for a wrong or expired code. */
export async function activate(code: string): Promise<boolean> {
  const t = readActivationCode(code);
  if (!t || t.kind !== "pro") return false;
  const jar = await cookies();
  jar.set(PRO_COOKIE, code.trim(), cookieOpts(Math.max(60, t.exp - Math.floor(Date.now() / 1000))));
  return true;
}

/** One free trial per phone (browser). */
export async function startTrial(): Promise<boolean> {
  const jar = await cookies();
  if (jar.get(TRIAL_USED_COOKIE)?.value === "1" || readActivationCode(jar.get(PRO_COOKIE)?.value ?? "")) return false;
  const days = PATIENT_PRO.trialDays;
  jar.set(PRO_COOKIE, makeToken({ k: "pp", kind: "trial" }, days * DAY), cookieOpts(days * DAY));
  jar.set(TRIAL_USED_COOKIE, "1", cookieOpts(5 * 365 * DAY));
  return true;
}
