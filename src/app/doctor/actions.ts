"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { assertRole } from "@/lib/staff";
import { courseDates, todayIST } from "@/lib/dates";
import { cleanText, parseDays } from "@/lib/validate";
import type { ErrorCode } from "@/lib/i18n";
import { parseRxLines } from "@/lib/rx";
import { rxMessage, waLink } from "@/lib/share";
import { formatDate } from "@/lib/dates";

type Res = { ok: true } | { ok: false; error: ErrorCode };

async function loadAppointment(appointmentId: string, clinicId: string) {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("appointments")
    .select("id, patient_id, clinic_id")
    .eq("id", appointmentId)
    .eq("clinic_id", clinicId)
    .maybeSingle();
  return data;
}

export async function saveVisit(appointmentId: string, notes: string, diagnosis: string): Promise<Res> {
  const staff = await assertRole(["doctor"]);
  const appt = await loadAppointment(appointmentId, staff.clinic_id);
  if (!appt) return { ok: false, error: "err_generic" };
  const supabase = await supabaseServer();
  const { error } = await supabase.from("visits").upsert(
    {
      clinic_id: staff.clinic_id,
      appointment_id: appt.id,
      patient_id: appt.patient_id,
      doctor_id: staff.id,
      doctor_notes: cleanText(notes, 8000) || null,
      diagnosis: cleanText(diagnosis, 1000) || null,
    },
    { onConflict: "appointment_id" },
  );
  if (error) return { ok: false, error: "err_generic" };
  revalidatePath("/doctor");
  return { ok: true };
}

export async function saveCourse(
  appointmentId: string,
  daysInput: string,
): Promise<{ ok: true; end_date: string; next_visit_date: string } | { ok: false; error: ErrorCode }> {
  const staff = await assertRole(["doctor"]);
  const days = parseDays(daysInput);
  if (!days) return { ok: false, error: "err_days" };
  const appt = await loadAppointment(appointmentId, staff.clinic_id);
  if (!appt) return { ok: false, error: "err_generic" };
  return writeCourse(staff.clinic_id, appt, days);
}

async function writeCourse(
  clinicId: string,
  appt: { id: string; patient_id: string },
  days: number,
): Promise<{ ok: true; end_date: string; next_visit_date: string } | { ok: false; error: ErrorCode }> {
  const staff = { clinic_id: clinicId };
  const start_date = todayIST();
  const { end_date, next_visit_date } = courseDates(start_date, days);
  const supabase = await supabaseServer();
  const { error } = await supabase.from("treatment_courses").upsert(
    {
      clinic_id: staff.clinic_id,
      patient_id: appt.patient_id,
      appointment_id: appt.id,
      start_date,
      days,
      end_date,
      next_visit_date,
      reminder_status: "pending",
    },
    { onConflict: "appointment_id" },
  );
  if (error) return { ok: false, error: "err_generic" };
  // A new course replaces reminders of older, still-open courses of this patient.
  await supabase
    .from("treatment_courses")
    .update({ reminder_status: "stopped" })
    .eq("patient_id", appt.patient_id)
    .neq("appointment_id", appt.id)
    .in("reminder_status", ["pending", "reminded"]);
  revalidatePath("/doctor");
  return { ok: true, end_date, next_visit_date };
}

export async function completeAndNext(appointmentId: string): Promise<Res> {
  await assertRole(["doctor"]);
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("complete_and_call_next", { p_appointment: appointmentId });
  if (error) return { ok: false, error: "err_generic" };
  revalidatePath("/doctor");
  return { ok: true };
}

export async function callNext(): Promise<Res> {
  const staff = await assertRole(["doctor"]);
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("call_next", { p_clinic: staff.clinic_id });
  if (error) return { ok: false, error: "err_generic" };
  revalidatePath("/doctor");
  return { ok: true };
}

/**
 * Saves the prescription (medicine, dose, when, days) and sets the treatment course from the
 * longest medicine, so the end date and the reminder follow automatically.
 * Returns a WhatsApp link with the prescription text for the patient's own number.
 */
export async function saveRx(
  appointmentId: string,
  input: unknown,
): Promise<{ ok: true; end_date: string; next_visit_date: string; wa: string } | { ok: false; error: ErrorCode }> {
  const staff = await assertRole(["doctor"]);
  const lines = parseRxLines(input);
  if (!lines) return { ok: false, error: "err_rx" };
  const appt = await loadAppointment(appointmentId, staff.clinic_id);
  if (!appt) return { ok: false, error: "err_generic" };
  const supabase = await supabaseServer();
  const { error: delErr } = await supabase.from("prescription_items").delete().eq("appointment_id", appt.id).eq("clinic_id", staff.clinic_id);
  if (delErr) return { ok: false, error: "err_generic" };
  const { error } = await supabase.from("prescription_items").insert(
    lines.map((l, i) => ({ ...l, position: i + 1, clinic_id: staff.clinic_id, appointment_id: appt.id, patient_id: appt.patient_id })),
  );
  if (error) return { ok: false, error: "err_generic" };
  const course = await writeCourse(staff.clinic_id, appt, Math.max(...lines.map((l) => l.days)));
  if (!course.ok) return course;

  const { data: p } = await supabase.from("patients").select("name, phone, language").eq("id", appt.patient_id).single();
  const lang = p?.language === "en" ? "en" : "hi";
  const text = rxMessage({
    lang,
    clinic: staff.clinic.name,
    doctor: staff.name,
    patient: p?.name ?? "",
    date: formatDate(todayIST(), lang),
    lines,
    nextVisit: formatDate(course.next_visit_date, lang, true),
  });
  return { ...course, wa: waLink(p?.phone ?? "", text) };
}

/**
 * Claude AI summary of the patient in the room. Sends only clinical facts
 * (age, gender, complaint, past diagnoses, notes, medicines), never name, phone or address.
 */
export async function aiPatientSummary(
  appointmentId: string,
): Promise<{ ok: true; lines: string[] } | { ok: false; error: "ai_off" | "ai_failed" | "ai_budget" | "ai_busy" | "ai_limit" | ErrorCode }> {
  const staff = await assertRole(["doctor"]);
  const { requireProAI } = await import("@/lib/ai-guard");
  const gate = await requireProAI(staff.clinic_id);
  if (!gate.ok) return { ok: false, error: "ai_off" };
  // Fair use, so one clinic can never run up a big AI bill (each summary ≈ ₹0.05).
  const { SUMMARY_DAILY_LIMIT } = await import("@/lib/ai-manager/tools-def");
  const { count } = await (await import("@/lib/supabase/server"))
    .supabaseAdmin()
    .from("audit_log")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", staff.clinic_id)
    .eq("action", "ai_summary")
    .gte("time", `${todayIST()}T00:00:00+05:30`);
  if ((count ?? 0) >= SUMMARY_DAILY_LIMIT[gate.plan.tier === "pro_max" ? "pro_max" : "pro"]) return { ok: false, error: "ai_limit" };
  const { summarizePatient } = await import("@/lib/ai");
  const appt = await loadAppointment(appointmentId, staff.clinic_id);
  if (!appt) return { ok: false, error: "err_generic" };
  const supabase = await supabaseServer();
  const [{ data: p }, { data: a }, { data: visits }, { data: meds }] = await Promise.all([
    supabase.from("patients").select("age, gender").eq("id", appt.patient_id).single(),
    supabase.from("appointments").select("complaint").eq("id", appt.id).single(),
    supabase
      .from("visits")
      .select("diagnosis, doctor_notes, created_at")
      .eq("patient_id", appt.patient_id)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("prescription_items")
      .select("medicine, dose, days, created_at")
      .eq("patient_id", appt.patient_id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  const { lang } = await (await import("@/lib/lang-server")).getT();
  try {
    const lines = await summarizePatient(
      {
        age: p?.age ?? null,
        gender: p?.gender ?? null,
        complaint: a?.complaint ?? null,
        visits: (visits ?? []).map((v) => ({ date: v.created_at.slice(0, 10), diagnosis: v.diagnosis, notes: v.doctor_notes })),
        medicines: (meds ?? []).map((m) => ({ date: m.created_at.slice(0, 10), medicine: m.medicine, dose: m.dose, days: m.days })),
      },
      lang,
    );
    if (!lines) return { ok: false, error: "ai_off" };
    const { audit } = await import("@/lib/audit");
    await audit(staff, "ai_summary", "patients", appt.patient_id, { lines: lines.length });
    return { ok: true, lines };
  } catch (e) {
    const { classifyAiError, reportAiFailure } = await import("@/lib/ai-errors");
    const kind = classifyAiError(e);
    console.error("[ai] summary failed", kind, e instanceof Error ? e.message : e);
    await reportAiFailure("summary", kind, "/doctor");
    return { ok: false, error: kind === "budget" || kind === "key" ? "ai_budget" : kind === "busy" ? "ai_busy" : "ai_failed" };
  }
}

export type ScribeResult =
  | { ok: true; draft: import("@/lib/scribe-parse").ScribeDraft }
  | { ok: false; error: "ai_off" | "ai_failed" | "ai_budget" | "ai_busy" | "ai_limit" | "ai_empty" | ErrorCode };

/**
 * AI Scribe (Pro): turns the doctor's dictation into a filled prescription form.
 * Sends only the dictated words to Claude. Saves nothing: the doctor checks and presses Save.
 */
export async function aiScribe(appointmentId: string, dictation: string): Promise<ScribeResult> {
  const staff = await assertRole(["doctor"]);
  const { requireProAI } = await import("@/lib/ai-guard");
  const gate = await requireProAI(staff.clinic_id);
  if (!gate.ok) return { ok: false, error: "ai_off" };
  const { MAX_DICTATION_CHARS, normalizeScribe } = await import("@/lib/scribe-parse");
  const text = cleanText(dictation, MAX_DICTATION_CHARS);
  if (text.replace(/\s/g, "").length < 6) return { ok: false, error: "ai_empty" };
  const appt = await loadAppointment(appointmentId, staff.clinic_id);
  if (!appt) return { ok: false, error: "err_generic" };
  // Fair use, so one clinic can never run up a big AI bill (each draft ≈ ₹0.05).
  const { SCRIBE_DAILY_LIMIT } = await import("@/lib/ai-manager/tools-def");
  const { count } = await (await import("@/lib/supabase/server"))
    .supabaseAdmin()
    .from("audit_log")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", staff.clinic_id)
    .eq("action", "ai_scribe")
    .gte("time", `${todayIST()}T00:00:00+05:30`);
  if ((count ?? 0) >= SCRIBE_DAILY_LIMIT[gate.plan.tier === "pro_max" ? "pro_max" : "pro"]) return { ok: false, error: "ai_limit" };
  const { lang } = await (await import("@/lib/lang-server")).getT();
  const { draftPrescription } = await import("@/lib/scribe");
  try {
    const raw = await draftPrescription(text, lang);
    if (raw === null) return { ok: false, error: "ai_failed" };
    const draft = normalizeScribe(raw, text);
    const { audit } = await import("@/lib/audit");
    await audit(staff, "ai_scribe", "patients", appt.patient_id, { lines: draft?.lines.length ?? 0, dropped: draft?.dropped.length ?? 0 });
    if (!draft) return { ok: false, error: "ai_empty" };
    return { ok: true, draft };
  } catch (e) {
    const { classifyAiError, reportAiFailure } = await import("@/lib/ai-errors");
    const kind = classifyAiError(e);
    console.error("[ai] scribe failed", kind, e instanceof Error ? e.message : e);
    await reportAiFailure("scribe", kind, "/doctor");
    return { ok: false, error: kind === "budget" || kind === "key" ? "ai_budget" : kind === "busy" ? "ai_busy" : "ai_failed" };
  }
}
