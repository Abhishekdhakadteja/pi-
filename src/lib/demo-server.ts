import "server-only";
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEMO_CLINIC_SLUG, DEMO_EMAIL_DOMAIN, type DemoRole } from "@/lib/demo";
import { todayIST } from "@/lib/dates";

// Builds and refreshes the demo clinic with FAKE data, so a doctor always sees a "live" day:
// today's queue (done / in room / waiting), this week's visits and the money page.
// Everything is idempotent and safe if two doctors start a demo at the same moment.

type Db = SupabaseClient;

export const DEMO_USERS: Record<DemoRole, { email: string; name: string }> = {
  doctor: { email: `doctor@${DEMO_EMAIL_DOMAIN}`, name: "Dr. Demo Sharma" },
  attender: { email: `desk@${DEMO_EMAIL_DOMAIN}`, name: "Demo Reception" },
};

const PATIENTS = [
  { name: "Ramesh Patel (demo)", phone: "9000010001", age: 54, gender: "male", address: "Vijay Nagar" },
  { name: "Sunita Verma (demo)", phone: "9000010002", age: 46, gender: "female", address: "Palasia" },
  { name: "Aarav Jain (demo)", phone: "9000010003", age: 9, gender: "male", address: "Rajwada" },
  { name: "Fatima Khan (demo)", phone: "9000010004", age: 33, gender: "female", address: "Khajrana" },
  { name: "Mohan Lal (demo)", phone: "9000010005", age: 67, gender: "male", address: "Bhawarkuan" },
  { name: "Priya Singh (demo)", phone: "9000010006", age: 28, gender: "female", address: "Sudama Nagar" },
  { name: "Kavita Yadav (demo)", phone: "9000010007", age: 39, gender: "female", address: "Annapurna" },
  { name: "Rahul Dubey (demo)", phone: "9000010008", age: 31, gender: "male", address: "MR 10" },
  { name: "Geeta Sharma (demo)", phone: "9000010009", age: 58, gender: "female", address: "Musakhedi" },
  { name: "Imran Ali (demo)", phone: "9000010010", age: 42, gender: "male", address: "Azad Nagar" },
  { name: "Neha Gupta (demo)", phone: "9000010011", age: 24, gender: "female", address: "Scheme 54" },
  { name: "Shankar Rao (demo)", phone: "9000010012", age: 71, gender: "male", address: "Nanda Nagar" },
];

const COMPLAINTS = [
  "Fever 3 days, body ache",
  "BP follow-up, headache",
  "Cough and cold",
  "Sugar check, tiredness",
  "Stomach pain after food",
  "Knee pain, old age",
  "Skin allergy, itching",
  "Thyroid report review",
];
const DIAGNOSES = ["Viral fever", "Hypertension, controlled", "URTI", "Type 2 diabetes follow-up", "Acidity / gastritis"];

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function slot(i: number): string {
  const min = 10 * 60 + i * 15; // 10:00, 10:15, ...
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** The demo clinic id, creating the clinic the first time. */
export async function ensureDemoClinic(db: Db): Promise<string | null> {
  const found = await db.from("clinics").select("id").eq("slug", DEMO_CLINIC_SLUG).maybeSingle();
  if (found.data?.id) return found.data.id as string;
  const { data, error } = await db
    .from("clinics")
    .insert({
      name: "Clinic Easy Demo Clinic",
      slug: DEMO_CLINIC_SLUG,
      address: "Demo Road, Indore",
      city: "Indore",
      doctor_name: DEMO_USERS.doctor.name,
      slots_per_day: 40,
      opening_time: "09:00",
      closing_time: "21:00",
      default_fee: 300,
      signup_status: "active",
      public_listing: false,
    })
    .select("id")
    .single();
  if (error) {
    // Someone else created it a moment ago.
    const again = await db.from("clinics").select("id").eq("slug", DEMO_CLINIC_SLUG).maybeSingle();
    return (again.data?.id as string) ?? null;
  }
  return data.id as string;
}

/** Makes sure the demo login exists and is active. Returns its auth user id. */
export async function ensureDemoUser(db: Db, clinicId: string, role: DemoRole): Promise<string | null> {
  const u = DEMO_USERS[role];
  const existing = await db.from("users").select("id, active, clinic_id").eq("email", u.email).maybeSingle();
  let id = existing.data?.id as string | undefined;
  if (!id) {
    const created = await db.auth.admin.createUser({
      email: u.email,
      email_confirm: true,
      // Nobody ever types this password: demo logins are started by the server only.
      password: randomBytes(24).toString("base64url"),
    });
    id = created.data.user?.id;
    if (!id) {
      // Auth user exists but the staff row is missing: find it through a sign-in link.
      const link = await db.auth.admin.generateLink({ type: "magiclink", email: u.email });
      id = link.data.user?.id;
    }
    if (!id) return null;
  }
  if (!existing.data || !existing.data.active || existing.data.clinic_id !== clinicId) {
    await db.from("users").upsert({ id, clinic_id: clinicId, name: u.name, email: u.email, role, active: true });
  }
  return id;
}

/** Fills today (and the last 6 days, once) with fake visits so every page has something to show. */
export async function refreshDemoData(db: Db, clinicId: string, doctorId: string | null, now: Date = new Date()): Promise<void> {
  const today = todayIST(now);
  const { count } = await db.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("date", today);
  if ((count ?? 0) >= 6) return;

  // Patients (once).
  const { data: have } = await db.from("patients").select("id, name").eq("clinic_id", clinicId);
  const names = new Set((have ?? []).map((p) => p.name));
  const missing = PATIENTS.filter((p) => !names.has(p.name));
  if (missing.length) {
    await db.from("patients").insert(
      missing.map((p) => ({ ...p, clinic_id: clinicId, consent_given: true, consent_date: now.toISOString(), language: "hi" })),
    );
  }
  const { data: pts } = await db.from("patients").select("id, name").eq("clinic_id", clinicId).order("name");
  if (!pts?.length) return;

  const days: { date: string; n: number; live: boolean }[] = [{ date: today, n: 8, live: true }];
  for (let d = 1; d <= 6; d++) days.push({ date: shiftDate(today, -d), n: 4 + ((d * 3) % 4), live: false });

  for (const day of days) {
    if (!day.live) {
      const { count: c } = await db.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("date", day.date);
      if ((c ?? 0) > 0) continue;
    }
    // Today may already have a few visits typed in by demo visitors: keep their tokens and patients.
    const { data: taken } = await db.from("appointments").select("patient_id, token_number").eq("clinic_id", clinicId).eq("date", day.date);
    const busy = new Set((taken ?? []).map((t) => t.patient_id));
    const firstToken = Math.max(0, ...(taken ?? []).map((t) => t.token_number as number));
    const offset = day.live ? 0 : Number(day.date.slice(-2)) % pts.length;
    const free = Array.from({ length: pts.length }, (_, i) => pts[(i + offset) % pts.length]).filter((p) => !busy.has(p.id));
    const rows = Array.from({ length: Math.min(day.n, free.length) }, (_, i) => {
      const status = !day.live ? "done" : i < 3 ? "done" : i === 3 ? "in_room" : i < 7 ? "waiting" : "booked";
      return {
        clinic_id: clinicId,
        patient_id: free[i].id,
        doctor_id: doctorId,
        date: day.date,
        slot_time: slot(firstToken + i),
        token_number: firstToken + i + 1,
        status,
        source: i % 3 === 0 ? "qr" : "attender",
        complaint: COMPLAINTS[(i + offset) % COMPLAINTS.length],
        completed_at: status === "done" ? new Date(`${day.date}T${slot(firstToken + i)}:00+05:30`).toISOString() : null,
      };
    });
    if (!rows.length) continue;
    const { data: appts, error } = await db.from("appointments").insert(rows).select("id, patient_id, status");
    if (error || !appts) continue; // another demo filled this day at the same moment
    const done = appts.filter((a) => a.status === "done");
    if (done.length) {
      await db.from("visits").insert(
        done.map((a, i) => ({
          clinic_id: clinicId,
          appointment_id: a.id,
          patient_id: a.patient_id,
          doctor_id: doctorId,
          diagnosis: DIAGNOSES[i % DIAGNOSES.length],
          doctor_notes: "Demo note: rest, fluids, review after 5 days.",
        })),
      );
      await db.from("payments").insert(
        done.map((a, i) => ({
          clinic_id: clinicId,
          appointment_id: a.id,
          patient_id: a.patient_id,
          paid_on: day.date,
          amount: i % 4 === 0 ? 500 : 300,
          mode: i % 2 === 0 ? "upi" : "cash",
          kind: i % 4 === 0 ? "procedure" : "consultation",
        })),
      );
    }
    if (day.live || day.date.endsWith("1")) {
      await db.from("expenses").insert({ clinic_id: clinicId, spent_on: day.date, category: day.live ? "medicine_purchase" : "electricity", amount: day.live ? 1200 : 800, note: "Demo expense" });
    }
  }
}
