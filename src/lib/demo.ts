// 5-minute live demo for doctors. Shared by middleware (edge), server code and the browser,
// so nothing here may import Node-only modules.

/** Demo logins live on this email domain. Any user with it is a demo user. */
export const DEMO_EMAIL_DOMAIN = "live-demo.cliniceasy.app";
/** The demo clinic (fake data, never shown in the public doctor finder). */
export const DEMO_CLINIC_SLUG = "live-demo";
/** Signed cookie that carries the demo's end time. Without it a demo login is signed out. */
export const DEMO_COOKIE = "ce_demo";
export const DEMO_MINUTES = 5;
export const DEMO_SECONDS = DEMO_MINUTES * 60;

export type DemoRole = "doctor" | "attender";
export const DEMO_ROLES: DemoRole[] = ["doctor", "attender"];

export function isDemoEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`);
}

/**
 * Reads the end time (unix seconds) from the demo cookie WITHOUT checking the signature.
 * Only for the middleware's quick redirect; the real check (signature + user) is in getStaff().
 */
export function demoCookieExp(value: string | undefined | null): number | null {
  if (!value) return null;
  const body = value.split(".")[0];
  if (!body) return null;
  try {
    const b64 = body.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4))) as { exp?: unknown };
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

/** Clean, short tracking label from ?ref= (e.g. "wa-greeting", "insta"). */
export function cleanRef(raw: unknown): string | null {
  const s = String(raw ?? "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  return s || null;
}
