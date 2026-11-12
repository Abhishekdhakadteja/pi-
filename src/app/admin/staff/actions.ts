"use server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { assertRole } from "@/lib/staff";
import { audit } from "@/lib/audit";
import { cleanName, normalizePhone } from "@/lib/validate";
import type { ErrorCode } from "@/lib/i18n";

type Res = { ok: true } | { ok: false; error: ErrorCode };
const ROLES = ["attender", "doctor", "admin"] as const;

/** Admin adds a staff login. Staff log in with email OR mobile + password. */
export async function addStaff(form: FormData): Promise<Res> {
  const admin = await assertRole(["admin"]);
  const name = cleanName(form.get("name"));
  if (!name) return { ok: false, error: "err_name" };
  const role = ROLES.find((r) => r === form.get("role"));
  if (!role) return { ok: false, error: "err_generic" };
  const phoneRaw = String(form.get("phone") ?? "").trim();
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (phoneRaw && !phone) return { ok: false, error: "err_phone" };
  const emailRaw = String(form.get("email") ?? "").trim().toLowerCase();
  if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) return { ok: false, error: "err_generic" };
  if (!emailRaw && !phone) return { ok: false, error: "err_phone" };
  const password = String(form.get("password") ?? "");
  if (password.length < 8 || password.length > 72) return { ok: false, error: "err_password" };
  // Mobile-only staff get a private placeholder email (they log in with the mobile number).
  const email = emailRaw || `${phone}@staff.clinicease.local`;

  const db = supabaseAdmin();
  if (phone) {
    const { data: taken } = await db.from("users").select("id").eq("phone", phone).maybeSingle();
    if (taken) return { ok: false, error: "err_exists" };
  }
  const { data: created, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !created.user) return { ok: false, error: error?.message?.toLowerCase().includes("already") ? "err_exists" : "err_generic" };
  const { error: e2 } = await db.from("users").insert({ id: created.user.id, clinic_id: admin.clinic_id, name, phone, email, role, active: true });
  if (e2) {
    await db.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: "err_generic" };
  }
  await audit(admin, "add_staff", "users", created.user.id, { role });
  revalidatePath("/admin/staff");
  return { ok: true };
}

/** Remove (deactivate) or bring back a staff member. History stays; the login stops working. */
export async function setStaffActive(id: string, active: boolean): Promise<Res> {
  const admin = await assertRole(["admin"]);
  if (id === admin.id) return { ok: false, error: "cannotRemoveSelf" };
  const supabase = await supabaseServer();
  const { error } = await supabase.from("users").update({ active }).eq("id", id).eq("clinic_id", admin.clinic_id);
  if (error) return { ok: false, error: "err_generic" };
  await audit(admin, active ? "restore_staff" : "remove_staff", "users", id);
  revalidatePath("/admin/staff");
  return { ok: true };
}
