"use server";
import { cookies } from "next/headers";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/server-env";
import { getSender } from "@/lib/messaging";
import { makeToken } from "@/lib/signed";
import { COOKIE, getSession, resolveReminderCode } from "./session";
import { addDays, todayIST } from "@/lib/dates";
import { cleanName, isValidDate, normalizePhone, parseAge } from "@/lib/validate";
import type { ErrorCode } from "@/lib/i18n";
import type { BookResult } from "@/lib/types";

// Public booking page. There is NO staff login here, so every action:
//  1. finds the clinic by its public slug,
//  2. requires a verified-OTP cookie for that clinic,
//  3. only touches patients whose phone equals the verified phone.
// The service-role client is used, so these checks are the security boundary.

const SESSION_TTL = 2 * 60 * 60; // 2 hours
const OTP_TTL_MIN = 10;
const MAX_SENDS_PER_10_MIN = 3;
const MAX_ATTEMPTS = 5;

type Fail = { ok: false; error: ErrorCode };

async function clinicBySlug(slug: string) {
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return null;
  const { data } = await supabaseAdmin().from("clinics").select("id, name, slots_per_day").eq("slug", slug).maybeSingle();
  return data;
}

function hashCode(phone: string, code: string) {
  return createHash("sha256").update(`${phone}:${code}:${serverEnv.patientSessionSecret()}`).digest("hex");
}


export async function sendOtp(slug: string, phoneInput: string): Promise<{ ok: true; phone: string } | Fail> {
  const clinic = await clinicBySlug(slug);
  if (!clinic) return { ok: false, error: "err_generic" };
  const phone = normalizePhone(phoneInput);
  if (!phone) return { ok: false, error: "err_phone" };
  const db = supabaseAdmin();

  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count } = await db.from("patient_otps").select("id", { count: "exact", head: true }).eq("phone", phone).gte("created_at", since);
  if ((count ?? 0) >= MAX_SENDS_PER_10_MIN) return { ok: false, error: "err_otp_rate" };

  const code = String(randomInt(100000, 1000000));
  const { error } = await db.from("patient_otps").insert({
    clinic_id: clinic.id,
    phone,
    code_hash: hashCode(phone, code),
    expires_at: new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString(),
  });
  if (error) return { ok: false, error: "err_generic" };

  const res = await getSender().send({
    to: phone,
    channel: "sms",
    purpose: "otp",
    body: `${code} is your ${clinic.name} booking OTP. Valid ${OTP_TTL_MIN} min. Do not share it.`,
  });
  if (res.status === "failed") return { ok: false, error: "err_generic" };
  return { ok: true, phone };
}

export async function verifyOtp(slug: string, phoneInput: string, codeInput: string): Promise<{ ok: true } | Fail> {
  const clinic = await clinicBySlug(slug);
  if (!clinic) return { ok: false, error: "err_generic" };
  const phone = normalizePhone(phoneInput);
  if (!phone) return { ok: false, error: "err_phone" };
  const code = String(codeInput ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { ok: false, error: "err_otp" };
  const db = supabaseAdmin();

  const { data: otp } = await db
    .from("patient_otps")
    .select("id, code_hash, expires_at, attempts, used_at")
    .eq("phone", phone)
    .eq("clinic_id", clinic.id)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!otp || otp.attempts >= MAX_ATTEMPTS || new Date(otp.expires_at) < new Date()) return { ok: false, error: "err_otp" };

  const demo = serverEnv.demoOtp(); // development only, never in production
  const a = Buffer.from(hashCode(phone, code));
  const b = Buffer.from(otp.code_hash);
  const match = (a.length === b.length && timingSafeEqual(a, b)) || (demo !== null && code === demo);
  if (!match) {
    await db.from("patient_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
    return { ok: false, error: "err_otp" };
  }
  await db.from("patient_otps").update({ used_at: new Date().toISOString() }).eq("id", otp.id);

  (await cookies()).set(COOKIE, makeToken({ phone, clinic: clinic.id }, SESSION_TTL), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL,
  });
  return { ok: true };
}

export type FamilyMember = { id: string; name: string; age: number | null };

/** Family members on the verified phone. */
export async function getFamily(slug: string): Promise<{ ok: true; members: FamilyMember[] } | Fail> {
  const clinic = await clinicBySlug(slug);
  if (!clinic) return { ok: false, error: "err_generic" };
  const s = await getSession(clinic.id);
  if (!s) return { ok: false, error: "err_session" };
  const { data, error } = await supabaseAdmin()
    .from("patients")
    .select("id, name, age")
    .eq("clinic_id", clinic.id)
    .eq("phone", s.phone)
    .order("created_at");
  if (error) return { ok: false, error: "err_generic" };
  return { ok: true, members: data ?? [] };
}

export async function addFamilyMember(
  slug: string,
  input: { name: string; age: string; consent: boolean },
): Promise<{ ok: true; member: FamilyMember } | Fail> {
  const clinic = await clinicBySlug(slug);
  if (!clinic) return { ok: false, error: "err_generic" };
  const s = await getSession(clinic.id);
  if (!s) return { ok: false, error: "err_session" };
  const name = cleanName(input.name);
  if (!name) return { ok: false, error: "err_name" };
  const age = parseAge(input.age);
  if (age === "invalid") return { ok: false, error: "err_age" };
  if (!input.consent) return { ok: false, error: "consentRequired" };
  const { data, error } = await supabaseAdmin()
    .from("patients")
    .insert({
      clinic_id: clinic.id,
      name,
      age,
      phone: s.phone,
      consent_given: true,
      consent_date: new Date().toISOString(),
    })
    .select("id, name, age")
    .single();
  if (error || !data) return { ok: false, error: "err_generic" };
  return { ok: true, member: data };
}

/** Next 14 days with the number of free slots. */
export async function getCalendar(slug: string): Promise<{ ok: true; days: { day: string; free: number }[] } | Fail> {
  const clinic = await clinicBySlug(slug);
  if (!clinic) return { ok: false, error: "err_generic" };
  if (!(await getSession(clinic.id))) return { ok: false, error: "err_session" };
  const { data, error } = await supabaseAdmin().rpc("free_slot_counts", { p_clinic: clinic.id, p_from: todayIST(), p_days: 14 });
  if (error) return { ok: false, error: "err_generic" };
  return { ok: true, days: data ?? [] };
}

export async function getDaySlots(slug: string, date: string): Promise<{ ok: true; slots: { token: number; slot_time: string }[] } | Fail> {
  const clinic = await clinicBySlug(slug);
  if (!clinic) return { ok: false, error: "err_generic" };
  if (!(await getSession(clinic.id))) return { ok: false, error: "err_session" };
  const today = todayIST();
  if (!isValidDate(date) || date < today || date > addDays(today, 13)) return { ok: false, error: "err_date" };
  const { data, error } = await supabaseAdmin().rpc("free_slots", { p_clinic: clinic.id, p_date: date });
  if (error) return { ok: false, error: "err_generic" };
  return { ok: true, slots: data ?? [] };
}

export async function confirmBooking(
  slug: string,
  patientId: string,
  date: string,
  token: number,
  reminderToken?: string | null,
): Promise<{ ok: true; booking: BookResult } | Fail> {
  const clinic = await clinicBySlug(slug);
  if (!clinic) return { ok: false, error: "err_generic" };
  const s = await getSession(clinic.id);
  if (!s) return { ok: false, error: "err_session" };
  const today = todayIST();
  if (!isValidDate(date) || date < today || date > addDays(today, 13)) return { ok: false, error: "err_date" };
  if (!Number.isInteger(token) || token < 1 || token > clinic.slots_per_day) return { ok: false, error: "err_generic" };

  const db = supabaseAdmin();
  // The patient must belong to the verified phone.
  const { data: patient } = await db.from("patients").select("id").eq("id", patientId).eq("clinic_id", clinic.id).eq("phone", s.phone).maybeSingle();
  if (!patient) return { ok: false, error: "err_session" };

  const { data, error } = await db.rpc("book_appointment", {
    p_clinic: clinic.id,
    p_patient: patient.id,
    p_date: date,
    p_source: "qr",
    p_token: token,
    p_status: "booked",
  });
  if (error) return { ok: false, error: "err_generic" };
  const booking = data as BookResult;

  // Booked from a reminder link? Remember it for reports and stop further reminders.
  const link = await resolveReminderCode(clinic.id, reminderToken);
  if (booking.result === "booked" && link && link.patient_id === patient.id) {
    await db.from("appointments").update({ reminder_id: link.id }).eq("id", booking.appointment.id);
  }
  if (booking.result === "booked") {
    await db
      .from("treatment_courses")
      .update({ reminder_status: "booked" })
      .eq("patient_id", patient.id)
      .in("reminder_status", ["reminded", "followed_up"]);
  }
  return { ok: true, booking };
}


export async function signOutPatient() {
  (await cookies()).delete(COOKIE);
}
