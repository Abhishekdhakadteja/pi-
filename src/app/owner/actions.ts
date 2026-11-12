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
