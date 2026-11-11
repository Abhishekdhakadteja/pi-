"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { assertRole } from "@/lib/staff";
import { courseDates, todayIST } from "@/lib/dates";
import { cleanText, parseDays } from "@/lib/validate";
import type { ErrorCode } from "@/lib/i18n";

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
