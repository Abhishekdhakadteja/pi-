import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { Staff } from "@/lib/staff";

/** Writes one row to audit_log as the logged-in staff member (insert-only table). */
export async function audit(
  staff: Staff,
  action: string,
  record_table: string,
  record_id: string | null,
  details?: Record<string, unknown>,
) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from("audit_log").insert({
    clinic_id: staff.clinic_id,
    user_id: staff.id,
    action,
    record_table,
    record_id,
    details: details ?? null,
  });
  if (error) console.error("audit_log insert failed", error.message);
}
