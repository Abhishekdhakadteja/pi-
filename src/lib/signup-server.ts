import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Shared by the sign-up page and the owner page.

/** Switch a pending self-registered clinic on: its logins start working. */
export async function activateClinic(db: SupabaseClient, clinicId: string, by: { userId: string | null; how: string }): Promise<boolean> {
  const { error: e1 } = await db.from("users").update({ active: true }).eq("clinic_id", clinicId);
  if (e1) return false;
  const { error: e2 } = await db.from("clinics").update({ signup_status: "active" }).eq("id", clinicId).eq("signup_status", "pending");
  if (e2) return false;
  await db.from("audit_log").insert({
    clinic_id: clinicId,
    user_id: by.userId,
    action: "signup_activated",
    record_table: "clinics",
    record_id: clinicId,
    details: { how: by.how },
  });
  return true;
}

/** Remove a sign-up that was never verified: its login accounts and the empty clinic. Never touches an active clinic. */
export async function removePendingClinic(db: SupabaseClient, clinicId: string): Promise<boolean> {
  const { data: clinic } = await db.from("clinics").select("signup_status").eq("id", clinicId).maybeSingle();
  if (!clinic || clinic.signup_status !== "pending") return false;
  const { data: staff } = await db.from("users").select("id").eq("clinic_id", clinicId);
  for (const s of staff ?? []) await db.auth.admin.deleteUser(s.id);
  // A pending clinic never has audit_log rows (append-only, no cascade): the first one is written on activation.
  const { error } = await db.from("clinics").delete().eq("id", clinicId);
  return !error;
}
