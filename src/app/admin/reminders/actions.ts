"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { assertRole } from "@/lib/staff";
import { audit } from "@/lib/audit";
import { isValidTemplate } from "@/lib/reminder-text";
import { normalizePhone } from "@/lib/validate";
import { optOutPhone } from "@/lib/reminders";
import type { ErrorCode } from "@/lib/i18n";

type Res = { ok: true; count?: number } | { ok: false; error: ErrorCode };

export async function saveTemplates(hi: string, en: string): Promise<Res> {
  const staff = await assertRole(["admin"]);
  const h = hi.trim();
  const e = en.trim();
  if (!isValidTemplate(h) || !isValidTemplate(e)) return { ok: false, error: "err_generic" };
  const supabase = await supabaseServer();
  const { error } = await supabase.from("clinics").update({ reminder_template_hi: h, reminder_template_en: e }).eq("id", staff.clinic_id);
  if (error) return { ok: false, error: "err_generic" };
  await audit(staff, "update_template", "clinics", staff.clinic_id);
  revalidatePath("/admin/reminders");
  return { ok: true };
}

export async function adminOptOut(phoneInput: string): Promise<Res> {
  const staff = await assertRole(["admin"]);
  const phone = normalizePhone(phoneInput);
  if (!phone) return { ok: false, error: "err_phone" };
  const count = await optOutPhone(phone, staff.clinic_id);
  await audit(staff, "opt_out", "patients", null, { count });
  revalidatePath("/admin/reminders");
  return { ok: true, count };
}
