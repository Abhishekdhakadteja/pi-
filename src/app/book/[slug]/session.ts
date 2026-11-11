import "server-only";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";
import { readToken } from "@/lib/signed";
import { normalizePhone } from "@/lib/validate";

// Patient (public page) session helpers. Server-only: NOT callable from the browser.
export const COOKIE = "ce_pt";
const LINK_DAYS = 14;
type Session = { phone: string; clinic: string };

export async function getSession(clinicId: string): Promise<Session | null> {
  const s = readToken<Session>((await cookies()).get(COOKIE)?.value);
  return s && s.clinic === clinicId && normalizePhone(s.phone) ? s : null;
}

/** Reminder link code -> { reminder id, patient id } if valid (14 days). */
export async function resolveReminderCode(clinicId: string, code: string | null | undefined) {
  if (!code || !/^[A-Za-z0-9]{8,16}$/.test(code)) return null;
  const { data } = await supabaseAdmin()
    .from("reminders")
    .select("id, patient_id, created_at")
    .eq("clinic_id", clinicId)
    .eq("link_code", code)
    .maybeSingle();
  if (!data || Date.now() - new Date(data.created_at).getTime() > LINK_DAYS * 86_400_000) return null;
  return data;
}
