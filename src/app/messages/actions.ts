"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { assertRole } from "@/lib/staff";
import { runReminderJob } from "@/lib/reminders";

export async function markReminderSent(id: string) {
  const staff = await assertRole(["attender", "doctor", "admin"]);
  if (!/^[0-9a-f-]{36}$/.test(id)) return { ok: false as const };
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("reminders")
    .update({ status: "sent", sent_at: new Date().toISOString(), sent_by: staff.id })
    .eq("id", id)
    .eq("clinic_id", staff.clinic_id)
    .in("status", ["manual", "failed", "logged"]);
  if (error) return { ok: false as const };
  revalidatePath("/messages");
  return { ok: true as const };
}

/** Same as the 9 AM job, only for this clinic. Safe to press many times (max 2 reminders per course). */
export async function prepareReminders() {
  const staff = await assertRole(["attender", "doctor", "admin"]);
  const summary = await runReminderJob(new Date(), staff.clinic_id);
  revalidatePath("/messages");
  return { ok: true as const, summary };
}
