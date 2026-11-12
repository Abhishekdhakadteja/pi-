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
