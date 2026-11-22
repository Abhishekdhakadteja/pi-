"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { assertOwner } from "@/lib/owner";
import { makeSlug, welcomeMessage } from "@/lib/owner-utils";
import { serverEnv } from "@/lib/server-env";
import { cleanName, cleanText, normalizePhone } from "@/lib/validate";

export type CreateClinicResult =
  | { ok: true; clinicName: string; message: string }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPI_RE = /^[A-Za-z0-9._-]{2,64}@[A-Za-z0-9.-]{2,64}$/;

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function password(form: FormData, key: string): string | null {
  const p = String(form.get(key) ?? "");
  return p.length >= 8 && p.length <= 72 ? p : null;
}

/** Placeholder login email for staff who log in with their mobile number (same rule as Admin → Staff). */
const phoneEmail = (phone: string) => `${phone}@staff.clinicease.local`;

/**
 * Owner creates a new clinic with its logins in one step:
 *  - Doctor (role doctor) logs in with mobile number.
 *  - Same doctor gets an Admin login (role admin) with their email, for settings, staff and UPI.
 *  - Optional attender (role attender) logs in with mobile number.
 * If any step fails, everything created so far is removed again.
 */
export async function createClinic(form: FormData): Promise<CreateClinicResult> {
  const owner = await assertOwner();

  const clinicName = cleanName(form.get("clinic_name"));
  if (!clinicName) return { ok: false, error: "Clinic का नाम लिखें।" };
  const address = cleanText(form.get("address"), 300) || null;
  const clinicPhoneRaw = str(form, "clinic_phone");
  const clinicPhone = clinicPhoneRaw ? normalizePhone(clinicPhoneRaw) : null;
  if (clinicPhoneRaw && !clinicPhone) return { ok: false, error: "Clinic का मोबाइल नंबर सही नहीं है।" };
  const upi = str(form, "upi_id") || null;
  if (upi && !UPI_RE.test(upi)) return { ok: false, error: "UPI ID सही नहीं है (जैसे name@okicici)।" };
  const feeRaw = str(form, "default_fee");
  const fee = feeRaw ? Number(feeRaw) : 0;
  if (!Number.isInteger(fee) || fee < 0 || fee > 100000) return { ok: false, error: "फ़ीस 0 से 1,00,000 के बीच लिखें।" };

  const doctorName = cleanName(form.get("doctor_name"));
  if (!doctorName) return { ok: false, error: "Doctor का नाम लिखें।" };
  const doctorPhone = normalizePhone(str(form, "doctor_phone"));
  if (!doctorPhone) return { ok: false, error: "Doctor का 10 अंकों का मोबाइल नंबर लिखें।" };
  const doctorEmail = str(form, "doctor_email").toLowerCase();
  if (!EMAIL_RE.test(doctorEmail) || doctorEmail.endsWith("@staff.clinicease.local"))
    return { ok: false, error: "Doctor का सही email लिखें (Admin login के लिए)।" };
  const doctorPassword = password(form, "doctor_password");
  if (!doctorPassword) return { ok: false, error: "Doctor का password कम से कम 8 अक्षर का रखें।" };

  const attenderName = cleanName(form.get("attender_name"));
  const attenderPhoneRaw = str(form, "attender_phone");
  let attender: { name: string; phone: string; password: string } | null = null;
  if (attenderName || attenderPhoneRaw) {
    const phone = normalizePhone(attenderPhoneRaw);
    if (!attenderName || !phone) return { ok: false, error: "Attender का नाम और 10 अंकों का मोबाइल दोनों लिखें, या दोनों ख़ाली छोड़ें।" };
    if (phone === doctorPhone) return { ok: false, error: "Doctor और attender का मोबाइल अलग होना चाहिए।" };
    const pw = password(form, "attender_password");
    if (!pw) return { ok: false, error: "Attender का password कम से कम 8 अक्षर का रखें।" };
    attender = { name: attenderName, phone, password: pw };
  }

  const db = supabaseAdmin();

  // Mobile numbers and the admin email must not belong to another login already.
  const phones = [doctorPhone, ...(attender ? [attender.phone] : [])];
  const { data: phoneTaken } = await db.from("users").select("phone").in("phone", phones);
  if (phoneTaken && phoneTaken.length > 0)
    return { ok: false, error: `मोबाइल ${phoneTaken.map((r) => r.phone).join(", ")} पहले से किसी login में है।` };
  const { data: emailTaken } = await db.from("users").select("id").eq("email", doctorEmail).limit(1);
  if (emailTaken && emailTaken.length > 0) return { ok: false, error: "यह email पहले से किसी login में है।" };

  const { data: clinic, error: clinicErr } = await db
    .from("clinics")
    .insert({
      name: clinicName,
      slug: makeSlug(clinicName, randomBytes(3).toString("hex")),
      address,
      phone: clinicPhone,
      upi_id: upi,
      default_fee: fee,
    })
    .select("id, name")
    .single();
  if (clinicErr || !clinic) {
    console.error("createClinic: clinic insert failed", clinicErr?.message);
    return { ok: false, error: "Clinic नहीं बन पाई। दोबारा कोशिश करें।" };
  }

  const createdAuthIds: string[] = [];
  const rollback = async () => {
    for (const id of createdAuthIds) await db.auth.admin.deleteUser(id);
    await db.from("clinics").delete().eq("id", clinic.id); // staff rows go with it (on delete cascade)
  };

  const logins = [
    { name: doctorName, phone: doctorPhone, email: phoneEmail(doctorPhone), password: doctorPassword, role: "doctor" as const },
    { name: `${doctorName} (Admin)`, phone: null, email: doctorEmail, password: doctorPassword, role: "admin" as const },
    ...(attender
      ? [{ name: attender.name, phone: attender.phone, email: phoneEmail(attender.phone), password: attender.password, role: "attender" as const }]
      : []),
  ];

  for (const l of logins) {
    const { data: created, error } = await db.auth.admin.createUser({ email: l.email, password: l.password, email_confirm: true });
    if (error || !created.user) {
      await rollback();
      const exists = error?.message?.toLowerCase().includes("already");
      return { ok: false, error: exists ? `${l.email} वाला login पहले से मौजूद है।` : "Login नहीं बन पाया। दोबारा कोशिश करें।" };
    }
    createdAuthIds.push(created.user.id);
    const { error: rowErr } = await db
      .from("users")
      .insert({ id: created.user.id, clinic_id: clinic.id, name: l.name, phone: l.phone, email: l.email, role: l.role, active: true });
    if (rowErr) {
      console.error("createClinic: users insert failed", rowErr.message);
      await rollback();
      return { ok: false, error: "Login नहीं बन पाया। दोबारा कोशिश करें।" };
    }
  }

  await db.from("audit_log").insert({
    clinic_id: clinic.id,
    user_id: owner.id,
    action: "owner_create_clinic",
    record_table: "clinics",
    record_id: clinic.id,
    details: { by: owner.email, logins: logins.map((l) => l.role) },
  });

  revalidatePath("/owner");
  return {
    ok: true,
    clinicName: clinic.name,
    message: welcomeMessage({
      appUrl: serverEnv.appUrl(),
      clinicName: clinic.name,
      doctorName,
      doctorPhone,
      adminEmail: doctorEmail,
      attenderPhone: attender?.phone ?? null,
    }),
  };
}

/** Pause a clinic (e.g. payment not received): all its logins stop working. Data stays. */
export async function setClinicActive(clinicId: string, active: boolean): Promise<{ ok: boolean; error?: string }> {
  const owner = await assertOwner();
  const db = supabaseAdmin();
  const { data: mine } = await db.from("users").select("clinic_id").eq("id", owner.id).maybeSingle();
  if (mine?.clinic_id === clinicId) return { ok: false, error: "अपनी ही clinic बंद नहीं कर सकते।" };
  const { error } = await db.from("users").update({ active }).eq("clinic_id", clinicId);
  if (error) return { ok: false, error: "बदलाव नहीं हो पाया।" };
  await db.from("audit_log").insert({
    clinic_id: clinicId,
    user_id: owner.id,
    action: active ? "owner_resume_clinic" : "owner_pause_clinic",
    record_table: "clinics",
    record_id: clinicId,
    details: { by: owner.email },
  });
  revalidatePath("/owner");
  return { ok: true };
}

/**
 * Owner switches Clinic Easy Pro on by hand (doctor paid by UPI / cash) or off (months = 0).
 * Records a "manual" payment so the clinic sees it in its payment list.
 */
export async function setClinicPlan(
  clinicId: string,
  plan: "pro" | "pro_max",
  months: number,
  amountRupees: number,
): Promise<{ ok: boolean; error?: string; until?: string }> {
  const owner = await assertOwner();
  const { extendPlan, isPaidPlan } = await import("@/lib/plans");
  const { getClinicPlanRow } = await import("@/lib/subscription");
  if (!isPaidPlan(plan) || !Number.isInteger(months) || months < 0 || months > 36) return { ok: false, error: "गलत प्लान या महीने।" };
  const amount = Math.max(0, Math.round(Number(amountRupees) || 0));
  const db = supabaseAdmin();
  const row = await getClinicPlanRow(clinicId);
  if (!row) return { ok: false, error: "पहले Pro वाला SQL (database update) चलाएँ।" };

  let until: string;
  if (months === 0) {
    until = new Date().toISOString();
  } else {
    let end = new Date();
    let base = row;
    for (let i = 0; i < months; i++) {
      end = extendPlan(base, plan, "month");
      base = { plan, plan_until: end.toISOString() };
    }
    until = end.toISOString();
  }
  const { error } = await db.from("clinics").update({ plan: months === 0 ? "basic" : plan, plan_until: until }).eq("id", clinicId);
  if (error) return { ok: false, error: "बदलाव नहीं हो पाया।" };
  if (months > 0) {
    await db.from("subscription_payments").insert({
      clinic_id: clinicId,
      plan,
      cycle: months >= 12 ? "year" : "month",
      amount_paise: amount * 100,
      provider: "manual",
      status: "paid",
      period_end: until,
      note: `${months} month(s) by owner ${owner.email}`,
    });
  }
  await db.from("audit_log").insert({
    clinic_id: clinicId,
    user_id: owner.id,
    action: months === 0 ? "owner_pro_off" : "owner_pro_on",
    record_table: "clinics",
    record_id: clinicId,
    details: { plan, months, amount, until, by: owner.email },
  });
  revalidatePath("/owner");
  return { ok: true, until };
}

/**
 * Patient Health Pro (₹499/month): after the patient pays (UPI/WhatsApp), the owner makes a signed
 * activation link and sends it on WhatsApp. No database row: the link itself carries the expiry.
 */
export async function makePatientProLink(
  phone: string,
  months: number,
): Promise<{ ok: true; link: string; whatsapp: string; until: string } | { ok: false; error: string }> {
  await assertOwner();
  const { makeActivationCode } = await import("@/lib/health/patient-pro");
  const digits = String(phone ?? "").replace(/\D/g, "").slice(-10);
  if (!/^[6-9]\d{9}$/.test(digits)) return { ok: false, error: "सही 10 अंकों का मोबाइल नंबर डालें।" };
  const m = Math.floor(Number(months));
  if (!Number.isInteger(m) || m < 1 || m > 24) return { ok: false, error: "1 से 24 महीने।" };
  const code = makeActivationCode(digits, m);
  const link = `${serverEnv.appUrl()}/health/pro/activate?code=${encodeURIComponent(code)}`;
  const until = new Date(Date.now() + (m * 30 + 3) * 86400000).toISOString().slice(0, 10);
  const text = `नमस्ते! आपका Clinic Easy Health Pro चालू करने का लिंक (${until} तक):\n${link}\n\nइसे उसी फोन पर खोलें जिस पर ऐप इस्तेमाल करना है।`;
  return { ok: true, link, until, whatsapp: `https://wa.me/91${digits}?text=${encodeURIComponent(text)}` };
}

/** Owner switches on a self sign-up after checking the doctor (free "team check" mode). Returns the WhatsApp text for the doctor. */
export async function approveSignup(clinicId: string): Promise<{ ok: true; message: string; phone: string | null } | { ok: false; error: string }> {
  const owner = await assertOwner();
  const { activateClinic } = await import("@/lib/signup-server");
  const { approvedText } = await import("@/lib/signup");
  const db = supabaseAdmin();
  const { data: clinic } = await db.from("clinics").select("name, signup_status").eq("id", clinicId).maybeSingle();
  if (!clinic || clinic.signup_status !== "pending") return { ok: false, error: "यह रजिस्ट्रेशन अब pending नहीं है।" };
  if (!(await activateClinic(db, clinicId, { userId: owner.id, how: `owner ${owner.email}` }))) return { ok: false, error: "चालू नहीं हो पाया।" };
  const { data: staff } = await db.from("users").select("name, role, phone, email").eq("clinic_id", clinicId);
  const doc = staff?.find((s) => s.role === "doctor");
  const admin = staff?.find((s) => s.role === "admin");
  revalidatePath("/owner");
  return {
    ok: true,
    phone: doc?.phone ?? null,
    message: approvedText({
      appUrl: serverEnv.appUrl(),
      doctorName: doc?.name ?? "",
      clinicName: clinic.name,
      phone: doc?.phone ?? "",
      email: admin?.email ?? "",
    }),
  };
}

/** Owner deletes a fake / duplicate self sign-up that was never switched on. */
export async function rejectSignup(clinicId: string): Promise<{ ok: boolean; error?: string }> {
  await assertOwner();
  const { removePendingClinic } = await import("@/lib/signup-server");
  const ok = await removePendingClinic(supabaseAdmin(), clinicId);
  revalidatePath("/owner");
  return ok ? { ok } : { ok, error: "हटाया नहीं जा सका।" };
}
