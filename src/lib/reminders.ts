import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/server-env";
import { getSender } from "@/lib/messaging";
import { randomBytes } from "node:crypto";
import { addDays, todayIST } from "@/lib/dates";
import { fillTemplate } from "@/lib/reminder-text";

// Daily reminder job (runs 9:00 AM India time).
//  1. First reminder: medicine course ends within the next 2 days and no reminder was sent yet.
//  2. Follow-up: 2 days after the first reminder, if the patient still has not booked. Then stop.
// Never more than 2 reminders per course (also enforced by a unique index in the database).

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
function linkCode(len = 10) {
  return Array.from(randomBytes(len), (b) => ALPHABET[b % ALPHABET.length]).join("");
}

type CourseRow = {
  id: string;
  clinic_id: string;
  patient_id: string;
  end_date: string;
  reminder_status: string;
  appointment: { doctor_id: string | null } | null;
  patient: { id: string; name: string; phone: string; language: string; consent_given: boolean; opted_out: boolean } | null;
  clinic: { id: string; name: string; slug: string; reminder_template_hi: string; reminder_template_en: string; reminder_channel: "sms" | "whatsapp" } | null;
};

export type JobSummary = { first: number; followUp: number; alreadyBooked: number; skippedNoConsent: number; failed: number };

export async function runReminderJob(now: Date = new Date()): Promise<JobSummary> {
  const db = supabaseAdmin();
  const today = todayIST(now);
  const summary: JobSummary = { first: 0, followUp: 0, alreadyBooked: 0, skippedNoConsent: 0, failed: 0 };
  const select =
    "id, clinic_id, patient_id, end_date, reminder_status, appointment:appointments(doctor_id), " +
    "patient:patients(id, name, phone, language, consent_given, opted_out), " +
    "clinic:clinics(id, name, slug, reminder_template_hi, reminder_template_en, reminder_channel)";

  // ---- 1. First reminders ----
  const { data: due, error: e1 } = await db
    .from("treatment_courses")
    .select(select)
    .eq("reminder_status", "pending")
    .gte("end_date", today)
    .lte("end_date", addDays(today, 2));
  if (e1) throw e1;

  for (const c of (due ?? []) as unknown as CourseRow[]) {
    if (!c.patient || !c.clinic) continue;
    if (!c.patient.consent_given || c.patient.opted_out) {
      summary.skippedNoConsent++;
      continue;
    }
    if (await hasUpcomingBooking(c.patient_id, today)) {
      await db.from("treatment_courses").update({ reminder_status: "booked" }).eq("id", c.id);
      summary.alreadyBooked++;
      continue;
    }
    const ok = await sendReminder(c, "first");
    if (ok === "sent") {
      await db.from("treatment_courses").update({ reminder_status: "reminded" }).eq("id", c.id);
      summary.first++;
    } else if (ok === "failed") summary.failed++;
  }

  // ---- 2. Follow-ups (2 days after the first reminder, only if not booked) ----
  const { data: reminded, error: e2 } = await db.from("treatment_courses").select(select).eq("reminder_status", "reminded");
  if (e2) throw e2;
  const cutoff = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000); // ~2 days (1h tolerance)

  for (const c of (reminded ?? []) as unknown as CourseRow[]) {
    if (!c.patient || !c.clinic) continue;
    const { data: first } = await db
      .from("reminders")
      .select("sent_at, created_at")
      .eq("course_id", c.id)
      .eq("kind", "first")
      .maybeSingle();
    const firstAt = first?.sent_at ?? first?.created_at;
    if (!firstAt || new Date(firstAt) > cutoff) continue;

    const { count } = await db
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", c.patient_id)
      .gte("created_at", firstAt);
    if ((count ?? 0) > 0) {
      await db.from("treatment_courses").update({ reminder_status: "booked" }).eq("id", c.id);
      summary.alreadyBooked++;
      continue;
    }
    if (!c.patient.consent_given || c.patient.opted_out) {
      await db.from("treatment_courses").update({ reminder_status: "stopped" }).eq("id", c.id);
      summary.skippedNoConsent++;
      continue;
    }
    const ok = await sendReminder(c, "follow_up");
    // After the follow-up we stop, whatever happens.
    await db.from("treatment_courses").update({ reminder_status: "followed_up" }).eq("id", c.id);
    if (ok === "sent") summary.followUp++;
    else if (ok === "failed") summary.failed++;
  }

  return summary;
}

async function hasUpcomingBooking(patientId: string, today: string) {
  const { count } = await supabaseAdmin()
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .gte("date", today)
    .in("status", ["booked", "waiting", "in_room"]);
  return (count ?? 0) > 0;
}

async function doctorName(clinicId: string, doctorId: string | null) {
  const db = supabaseAdmin();
  if (doctorId) {
    const { data } = await db.from("users").select("name").eq("id", doctorId).maybeSingle();
    if (data?.name) return data.name;
  }
  const { data } = await db.from("users").select("name").eq("clinic_id", clinicId).eq("role", "doctor").eq("active", true).order("created_at").limit(1);
  return data?.[0]?.name ?? "";
}

async function sendReminder(c: CourseRow, kind: "first" | "follow_up"): Promise<"sent" | "duplicate" | "failed"> {
  const db = supabaseAdmin();
  const p = c.patient!;
  const clinic = c.clinic!;
  // Reserve the (course, kind) slot first: the unique index makes a second reminder of the same kind impossible.
  const { data: row, error } = await db
    .from("reminders")
    .insert({ clinic_id: c.clinic_id, patient_id: p.id, course_id: c.id, kind, channel: clinic.reminder_channel, status: "queued", link_code: linkCode() })
    .select("id, link_code")
    .single();
  if (error || !row) return "duplicate";

  // Personal link: opens the booking page; the patient is pre-selected only AFTER the OTP step.
  const link = `${serverEnv.appUrl()}/book/${clinic.slug}?r=${row.link_code}`;
  const template = p.language === "en" ? clinic.reminder_template_en : clinic.reminder_template_hi;
  const body = fillTemplate(template, { patient: p.name, doctor: await doctorName(c.clinic_id, c.appointment?.doctor_id ?? null), clinic: clinic.name, link });

  const res = await getSender().send({ to: p.phone, channel: clinic.reminder_channel, body, purpose: "reminder" });
  await db
    .from("reminders")
    .update({
      message: body,
      status: res.status,
      sent_at: res.status === "failed" ? null : new Date().toISOString(),
      provider_ref: res.providerRef ?? null,
      error: res.error ?? null,
    })
    .eq("id", row.id);
  return res.status === "failed" ? "failed" : "sent";
}

/** Stop all messages to a phone number (patient replied STOP or admin opted them out). */
export async function optOutPhone(phone: string, clinicId?: string) {
  const db = supabaseAdmin();
  let q = db.from("patients").update({ opted_out: true, opted_out_at: new Date().toISOString() }).eq("phone", phone);
  if (clinicId) q = q.eq("clinic_id", clinicId);
  const { data: patients } = await q.select("id");
  const ids = (patients ?? []).map((p) => p.id);
  if (ids.length) {
    await db.from("reminders").update({ opted_out: true }).in("patient_id", ids);
    await db.from("treatment_courses").update({ reminder_status: "stopped" }).in("patient_id", ids).in("reminder_status", ["pending", "reminded"]);
  }
  return ids.length;
}
