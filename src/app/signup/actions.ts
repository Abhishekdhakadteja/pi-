"use server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";
import { makeToken, readToken } from "@/lib/signed";
import { makeSlug } from "@/lib/owner-utils";
import { getTeam } from "@/lib/contact";
import { maskTarget, parseSignup, pickChannel, signupRef, teamVerifyText, type SignupField } from "@/lib/signup";
import {
  MAX_ATTEMPTS,
  MAX_SENDS_PER_10_MIN,
  OTP_TTL_MIN,
  availableChannels,
  codeMatches,
  hashSignupCode,
  newCode,
  sendSignupCode,
} from "@/lib/signup-otp";
import { activateClinic, removePendingClinic } from "@/lib/signup-server";

// Public doctor sign-up. Nobody is logged in here, so the service-role client is used and these
// checks are the security boundary:
//  - a new clinic and its two logins are created INACTIVE (signup_status 'pending'),
//  - they switch on only after the OTP is verified, or after the Clinic Easy team approves on /owner,
//  - the verify step only works with the signed cookie set by the same browser at sign-up.

export type SignupError = SignupField | "exists" | "pendingExists" | "busy" | "dbUpdate" | "generic";
export type RegisterResult =
  | { ok: true; mode: "otp"; channel: "email" | "mobile"; to: string }
  | { ok: true; mode: "team"; ref: string; whatsapp: string | null }
  | { ok: false; error: SignupError };
export type VerifyResult = { ok: true; phone: string } | { ok: false; error: "otp" | "otpExpired" | "session" | "generic" };
export type ResendResult = { ok: true } | { ok: false; error: "rate" | "session" | "generic" };

const COOKIE = "ce_signup";
const COOKIE_TTL = 24 * 60 * 60;
const STALE_MS = 24 * 60 * 60 * 1000;
const MAX_PENDING_PER_HOUR = 30;

type SignupCookie = { c: string; ch: "email" | "mobile" | "team"; t: string };

const phoneEmail = (phone: string) => `${phone}@staff.clinicease.local`;

async function setCookie(v: SignupCookie) {
  (await cookies()).set(COOKIE, makeToken(v, COOKIE_TTL), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/signup",
    maxAge: COOKIE_TTL,
  });
}

async function readCookie(): Promise<SignupCookie | null> {
  return readToken<SignupCookie>((await cookies()).get(COOKIE)?.value);
}

/**
 * Is this mobile / email already used by a login? An unverified sign-up is cleared when it is
 * older than a day or when the same doctor (same email) tries again.
 */
async function checkTaken(phone: string, email: string): Promise<"free" | "exists" | "pendingExists" | "dbUpdate"> {
  const db = supabaseAdmin();
  const { data: rows, error } = await db
    .from("users")
    .select("clinic_id, email, phone")
    .or(`phone.eq.${phone},email.eq.${email},email.eq.${phoneEmail(phone)}`);
  if (error) return "dbUpdate";
  const clinicIds = [...new Set((rows ?? []).map((r) => r.clinic_id as string))];
  if (clinicIds.length === 0) return "free";
  const { data: clinics, error: cErr } = await db.from("clinics").select("id, signup_status, created_at").in("id", clinicIds);
  if (cErr) return "dbUpdate"; // the sign-up database update has not been run yet
  for (const c of clinics ?? []) {
    if (c.signup_status !== "pending") return "exists";
    const sameDoctor = (rows ?? []).some((r) => r.clinic_id === c.id && r.email === email);
    const stale = Date.now() - new Date(c.created_at).getTime() > STALE_MS;
    if (!sameDoctor && !stale) return "pendingExists";
  }
  for (const c of clinics ?? []) await removePendingClinic(db, c.id);
  return "free";
}

export async function registerDoctor(form: FormData): Promise<RegisterResult> {
  const parsed = parseSignup((k) => form.get(k));
  if (!parsed.ok) return { ok: false, error: parsed.field };
  const v = parsed.value;
  const db = supabaseAdmin();

  // Spam guard: a burst of sign-ups is never a real rush of doctors.
  const hourAgo = new Date(Date.now() - 60 * 60_000).toISOString();
  const { count, error: countErr } = await db
    .from("clinics")
    .select("id", { count: "exact", head: true })
    .eq("signup_status", "pending")
    .gte("created_at", hourAgo);
  if (countErr) return { ok: false, error: "dbUpdate" };
  if ((count ?? 0) >= MAX_PENDING_PER_HOUR) return { ok: false, error: "busy" };

  const taken = await checkTaken(v.phone, v.email);
  if (taken !== "free") return { ok: false, error: taken };

  const { data: clinic, error: clinicErr } = await db
    .from("clinics")
    .insert({
      name: v.clinicName,
      slug: makeSlug(v.clinicName, randomBytes(3).toString("hex")),
      phone: v.phone,
      city: v.city,
      specialty: v.specialty,
      specialty_other: v.specialtyOther,
      doctor_reg_no: v.regNo,
      public_listing: v.publicListing,
      signup_status: "pending",
      signup_source: "self",
    })
    .select("id")
    .single();
  if (clinicErr || !clinic) {
    console.error("signup: clinic insert failed", clinicErr?.message);
    return { ok: false, error: clinicErr?.message?.includes("column") ? "dbUpdate" : "generic" };
  }

  // Same two logins as a clinic made from /owner: doctor screen by mobile, admin by email. Both OFF until verified.
  const logins = [
    { name: v.doctorName, phone: v.phone, email: phoneEmail(v.phone), role: "doctor" as const },
    { name: `${v.doctorName} (Admin)`, phone: null, email: v.email, role: "admin" as const },
  ];
  const created: string[] = [];
  const rollback = async () => {
    for (const id of created) await db.auth.admin.deleteUser(id);
    await db.from("clinics").delete().eq("id", clinic.id);
  };
  for (const l of logins) {
    const { data, error } = await db.auth.admin.createUser({ email: l.email, password: v.password, email_confirm: true });
    if (error || !data.user) {
      await rollback();
      return { ok: false, error: error?.message?.toLowerCase().includes("already") ? "exists" : "generic" };
    }
    created.push(data.user.id);
    const { error: rowErr } = await db
      .from("users")
      .insert({ id: data.user.id, clinic_id: clinic.id, name: l.name, phone: l.phone, email: l.email, role: l.role, active: false });
    if (rowErr) {
      console.error("signup: users insert failed", rowErr.message);
      await rollback();
      return { ok: false, error: rowErr.code === "23505" ? "exists" : "generic" };
    }
  }

  // Send the OTP on the chosen way if it is switched on; otherwise (or if sending fails) the team checks on WhatsApp.
  let channel = pickChannel(v.channel, availableChannels());
  if (channel !== "team") {
    const target = channel === "email" ? v.email : v.phone;
    const code = newCode();
    const { error } = await db.from("signup_otps").insert({
      clinic_id: clinic.id,
      channel,
      target,
      code_hash: hashSignupCode(target, code),
      expires_at: new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString(),
    });
    if (!error && (await sendSignupCode(channel, target, code))) {
      await setCookie({ c: clinic.id, ch: channel, t: target });
      return { ok: true, mode: "otp", channel, to: maskTarget(target) };
    }
    channel = "team";
  }

  await setCookie({ c: clinic.id, ch: "team", t: v.phone });
  const ref = signupRef(clinic.id);
  const sales = getTeam().find((p) => p.role === "sales") ?? getTeam()[0];
  const text = teamVerifyText({ ref, doctorName: v.doctorName, clinicName: v.clinicName, city: v.city, phone: v.phone });
  return { ok: true, mode: "team", ref, whatsapp: sales?.phone ? `https://wa.me/91${sales.phone}?text=${encodeURIComponent(text)}` : null };
}

export async function verifySignupCode(codeInput: string): Promise<VerifyResult> {
  const s = await readCookie();
  if (!s || s.ch === "team") return { ok: false, error: "session" };
  const code = String(codeInput ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { ok: false, error: "otp" };
  const db = supabaseAdmin();

  const { data: otp } = await db
    .from("signup_otps")
    .select("id, target, code_hash, expires_at, attempts")
    .eq("clinic_id", s.c)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!otp) return { ok: false, error: "session" };
  if (otp.attempts >= MAX_ATTEMPTS || new Date(otp.expires_at) < new Date()) return { ok: false, error: "otpExpired" };
  if (!codeMatches(otp.target, code, otp.code_hash)) {
    await db.from("signup_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
    return { ok: false, error: "otp" };
  }
  await db.from("signup_otps").update({ used_at: new Date().toISOString() }).eq("id", otp.id);

  if (!(await activateClinic(db, s.c, { userId: null, how: `otp_${s.ch}` }))) return { ok: false, error: "generic" };
  const { data: doc } = await db.from("users").select("phone").eq("clinic_id", s.c).eq("role", "doctor").maybeSingle();
  (await cookies()).delete({ name: COOKIE, path: "/signup" });
  return { ok: true, phone: doc?.phone ?? "" };
}

export async function resendSignupCode(): Promise<ResendResult> {
  const s = await readCookie();
  if (!s || s.ch === "team") return { ok: false, error: "session" };
  const db = supabaseAdmin();
  const { data: clinic } = await db.from("clinics").select("signup_status").eq("id", s.c).maybeSingle();
  if (!clinic || clinic.signup_status !== "pending") return { ok: false, error: "session" };

  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count } = await db.from("signup_otps").select("id", { count: "exact", head: true }).eq("clinic_id", s.c).gte("created_at", since);
  if ((count ?? 0) >= MAX_SENDS_PER_10_MIN) return { ok: false, error: "rate" };

  const code = newCode();
  const { error } = await db.from("signup_otps").insert({
    clinic_id: s.c,
    channel: s.ch,
    target: s.t,
    code_hash: hashSignupCode(s.t, code),
    expires_at: new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString(),
  });
  if (error) return { ok: false, error: "generic" };
  return (await sendSignupCode(s.ch, s.t, code)) ? { ok: true } : { ok: false, error: "generic" };
}
