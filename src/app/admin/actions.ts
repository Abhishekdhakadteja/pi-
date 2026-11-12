"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { assertRole } from "@/lib/staff";
import { audit } from "@/lib/audit";
import { cleanName, cleanText, normalizePhone } from "@/lib/validate";
import { isValidUpiId } from "@/lib/share";
import { parseAmount } from "@/lib/money";
import type { ErrorCode } from "@/lib/i18n";

type Res = { ok: true } | { ok: false; error: ErrorCode };
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function updateClinic(form: FormData): Promise<Res> {
  const staff = await assertRole(["admin"]);
  const name = cleanName(form.get("name"));
  if (!name) return { ok: false, error: "err_name" };
  const phoneRaw = String(form.get("phone") ?? "").trim();
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (phoneRaw && !phone) return { ok: false, error: "err_phone" };
  const slots = Number(form.get("slots_per_day"));
  const opening = String(form.get("opening_time") ?? "").slice(0, 5);
  const closing = String(form.get("closing_time") ?? "").slice(0, 5);
  if (!Number.isInteger(slots) || slots < 1 || slots > 300 || !TIME.test(opening) || !TIME.test(closing) || closing <= opening) {
    return { ok: false, error: "err_generic" };
  }
  const upiRaw = String(form.get("upi_id") ?? "").trim();
  if (upiRaw && !isValidUpiId(upiRaw)) return { ok: false, error: "err_upi" };
  const fee = parseAmount(form.get("default_fee") || "0", 0, 100000);
  if (fee === null) return { ok: false, error: "err_amount" };
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("clinics")
    .update({
      name,
      phone,
      address: cleanText(form.get("address"), 300) || null,
      slots_per_day: slots,
      opening_time: opening,
      closing_time: closing,
      upi_id: upiRaw || null,
      default_fee: fee,
      booking_otp: form.get("booking_otp") === "on",
    })
    .eq("id", staff.clinic_id);
  if (error) return { ok: false, error: "err_generic" };
  await audit(staff, "update", "clinics", staff.clinic_id);
  revalidatePath("/admin");
  return { ok: true };
}
