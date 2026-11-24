import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/server-env";
import { isPlaceholderEmail, type ResetId } from "@/lib/password-reset";

// Server side of "forgot password": hashing, and finding the email a reset code may go to.

export function hashResetId(id: ResetId): string {
  return createHash("sha256").update(`reset-id:${id.kind}:${id.value}:${serverEnv.patientSessionSecret()}`).digest("hex").slice(0, 40);
}

export function hashResetCode(userId: string, code: string): string {
  return createHash("sha256").update(`reset:${userId}:${code}:${serverEnv.patientSessionSecret()}`).digest("hex");
}

export function resetCodeMatches(userId: string, code: string, storedHash: string | null): boolean {
  if (!storedHash) return false;
  const a = Buffer.from(hashResetCode(userId, code));
  const b = Buffer.from(storedHash);
  const demo = serverEnv.demoOtp(); // development only, never in production
  return (a.length === b.length && timingSafeEqual(a, b)) || (demo !== null && code === demo);
}

export function newResetCode(): string {
  return String(randomInt(100000, 1000000));
}

/** A strong temporary password for the owner fallback: no look-alike letters, always has a digit. */
export function tempPassword(): string {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  let p = "";
  for (let i = 0; i < 7; i++) p += letters[randomInt(letters.length)];
  for (let i = 0; i < 3; i++) p += digits[randomInt(digits.length)];
  return p;
}

export type ResetTarget = { userId: string; clinicId: string; email: string; phone: string | null; loginEmail: string };

/**
 * Which login is this, and which real inbox may get its code?
 *  - a login with a real email: that email;
 *  - a mobile-only login (doctor screen, attender): the clinic's Admin email. For a doctor that is
 *    their own email; for staff it means the clinic admin approves the reset.
 * Only active logins of active clinics. null = nobody (the caller says the same thing either way).
 */
export async function findResetTarget(db: SupabaseClient, id: ResetId): Promise<ResetTarget | null> {
  const q = db.from("users").select("id, clinic_id, email, phone, active").eq("active", true).limit(1);
  const { data: u } = await (id.kind === "phone" ? q.eq("phone", id.value) : q.eq("email", id.value)).maybeSingle();
  if (!u) return null;
  const { data: clinic } = await db.from("clinics").select("signup_status").eq("id", u.clinic_id).maybeSingle();
  if (!clinic || (clinic.signup_status && clinic.signup_status !== "active")) return null;

  let email: string | null = u.email && !isPlaceholderEmail(u.email) ? u.email : null;
  if (!email) {
    const { data: admins } = await db
      .from("users")
      .select("email")
      .eq("clinic_id", u.clinic_id)
      .eq("role", "admin")
      .eq("active", true)
      .order("created_at", { ascending: true });
    email = (admins ?? []).map((a) => a.email as string).find((e) => e && !isPlaceholderEmail(e)) ?? null;
  }
  if (!email) return null;
  return { userId: u.id, clinicId: u.clinic_id, email: email.toLowerCase(), phone: u.phone, loginEmail: u.email };
}
