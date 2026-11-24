// "Forgot password" rules that both the browser and the server use. No secrets here, so the
// login page can show the same strength check the server enforces.

import { normalizePhone } from "@/lib/validate";

export const RESET_TTL_MIN = 10;
export const RESET_MAX_ATTEMPTS = 5;

// Limits on sending reset emails. They count every request, whether or not the login exists,
// so the answer never tells a stranger which numbers or emails have an account.
export const RESET_LIMITS = {
  idPer10Min: 3, // one login cannot be flooded with emails
  idPerDay: 8,
  ipPer10Min: 5, // one phone/computer cannot try many logins
  ipPerDay: 20,
} as const;

export type ResetCounts = { id10: number; idDay: number; ip10: number; ipDay: number };

export function resetLimited(c: ResetCounts, L = RESET_LIMITS): boolean {
  return c.id10 >= L.idPer10Min || c.idDay >= L.idPerDay || c.ip10 >= L.ipPer10Min || c.ipDay >= L.ipPerDay;
}

const PLACEHOLDER_DOMAIN = "@staff.clinicease.local";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mobile-only staff have a made-up email like 98xxxxxxxx@staff.clinicease.local that nobody can receive. */
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(PLACEHOLDER_DOMAIN);
}

export type ResetId = { kind: "email"; value: string } | { kind: "phone"; value: string };

/** What the person typed on the "forgot password" page: a real email or a 10-digit mobile. */
export function parseResetId(raw: unknown): ResetId | null {
  const s = String(raw ?? "").trim();
  if (!s || s.length > 120) return null;
  if (s.includes("@")) {
    const email = s.toLowerCase();
    if (isPlaceholderEmail(email)) {
      const phone = normalizePhone(email.slice(0, -PLACEHOLDER_DOMAIN.length));
      return phone ? { kind: "phone", value: phone } : null;
    }
    return EMAIL_RE.test(email) ? { kind: "email", value: email } : null;
  }
  const phone = normalizePhone(s);
  return phone ? { kind: "phone", value: phone } : null;
}

// Passwords people in India most often pick. Short on purpose: length + variety does most of the work.
const COMMON = new Set([
  "password", "password1", "password123", "passw0rd", "12345678", "123456789", "1234567890", "87654321",
  "11111111", "00000000", "qwerty123", "qwertyui", "asdfghjk", "abcd1234", "abc12345", "iloveyou",
  "india123", "india@123", "welcome1", "welcome123", "admin123", "admin@123", "doctor123", "doctor@123",
  "clinic123", "clinic@123", "clinicease", "clinicease1", "test1234", "sairam123", "jaishreeram",
]);

export type PasswordProblem = "short" | "long" | "weak" | "common" | "personal";

/** null when the new password is good enough; otherwise why not. */
export function passwordProblem(pw: string, personal: { phone?: string | null; email?: string | null } = {}): PasswordProblem | null {
  if (pw.length < 8) return "short";
  if (pw.length > 72) return "long";
  const lower = pw.toLowerCase();
  if (COMMON.has(lower)) return "common";
  if (!/[a-zA-Zऀ-ॿ]/.test(pw) || !/[0-9]/.test(pw)) return "weak";
  if (/^(.)\1+$/.test(pw) || new Set(lower).size < 4) return "weak";
  const phone = personal.phone?.replace(/\D/g, "");
  if (phone && phone.length >= 6 && lower.includes(phone.slice(-6))) return "personal";
  const local = personal.email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && !isPlaceholderEmail(personal.email) && lower.includes(local)) return "personal";
  return null;
}

/** 0 (bad) to 4 (strong), for the little meter under the box. Never decides alone; passwordProblem does. */
export function passwordScore(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (passwordProblem(pw)) return pw.length >= 8 ? 1 : 0;
  let s = 2;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) s++;
  return Math.min(s, 4) as 2 | 3 | 4;
}

/** Text the owner sends to a doctor after resetting the password from /owner. */
export function ownerResetText(p: { name: string; loginId: string; password: string; appUrl: string }): string {
  return [
    `नमस्ते ${p.name} जी,`,
    `आपका Clinic Easy password रीसेट कर दिया गया है।`,
    `Login: ${p.loginId}`,
    `नया अस्थायी password: ${p.password}`,
    `${p.appUrl}/login`,
    `Login के बाद "पासवर्ड भूल गए?" से अपना नया password ज़रूर बना लें। यह message किसी को न भेजें।`,
  ].join("\n");
}
