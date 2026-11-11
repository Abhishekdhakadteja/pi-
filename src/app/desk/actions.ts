"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { assertRole } from "@/lib/staff";
import { audit } from "@/lib/audit";
import { todayIST } from "@/lib/dates";
import { cleanName, cleanText, isValidDate, normalizePhone, parseAge, parseGender } from "@/lib/validate";
import type { BookResult, PatientSummary } from "@/lib/types";
import type { ErrorCode } from "@/lib/i18n";

type Fail = { ok: false; error: ErrorCode };

const DESK_ROLES = ["attender", "admin"] as const;

/** Find all patients (family members) on one phone number. */
export async function searchPatients(phoneInput: string): Promise<{ ok: true; phone: string; patients: PatientSummary[] } | Fail> {
  const staff = await assertRole([...DESK_ROLES]);
  const phone = normalizePhone(phoneInput);
  if (!phone) return { ok: false, error: "err_phone" };
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("patients")
    .select("id, name, phone, age, gender, appointments(date, status)")
    .eq("clinic_id", staff.clinic_id)
    .eq("phone", phone)
    .order("created_at");
  if (error) return { ok: false, error: "err_generic" };
  const patients: PatientSummary[] = (data ?? []).map((p) => {
    const visits = (p.appointments as { date: string; status: string }[]).filter((a) => a.status === "done").map((a) => a.date);
    visits.sort();
    return { id: p.id, name: p.name, phone: p.phone, age: p.age, gender: p.gender, last_visit: visits.at(-1) ?? null };
  });
  for (const p of patients) await audit(staff, "view", "patients", p.id, { via: "desk_search" });
  return { ok: true, phone, patients };
}

/** Add a new patient. Consent is required. */
export async function addPatient(input: {
  name: string;
  phone: string;
  age: string;
  gender: string;
  address: string;
  consent: boolean;
}): Promise<{ ok: true; patient: PatientSummary } | Fail> {
  const staff = await assertRole([...DESK_ROLES]);
  const name = cleanName(input.name);
  if (!name) return { ok: false, error: "err_name" };
  const phone = normalizePhone(input.phone);
  if (!phone) return { ok: false, error: "err_phone" };
  const age = parseAge(input.age);
  if (age === "invalid") return { ok: false, error: "err_age" };
  if (!input.consent) return { ok: false, error: "consentRequired" };

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("patients")
    .insert({
      clinic_id: staff.clinic_id,
      name,
      phone,
      age,
      gender: parseGender(input.gender),
      address: cleanText(input.address, 300) || null,
      consent_given: true,
      consent_date: new Date().toISOString(),
    })
    .select("id, name, phone, age, gender")
    .single();
  if (error || !data) return { ok: false, error: "err_generic" };
  return { ok: true, patient: { ...data, last_visit: null } };
}

/** Book the next free slot on a day (today by default). */
export async function bookPatient(patientId: string, date?: string): Promise<{ ok: true; booking: BookResult } | Fail> {
  const staff = await assertRole([...DESK_ROLES]);
  const today = todayIST();
  const day = date ?? today;
  if (!isValidDate(day) || day < today) return { ok: false, error: "err_date" };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("book_appointment", {
    p_clinic: staff.clinic_id,
    p_patient: patientId,
    p_date: day,
    p_source: "attender",
    p_status: day === today ? "waiting" : "booked",
  });
  if (error) return { ok: false, error: "err_generic" };
  return { ok: true, booking: data as BookResult };
}
