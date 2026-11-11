"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { assertRole } from "@/lib/staff";

export async function markMissed(appointmentId: string) {
  const staff = await assertRole(["attender", "admin"]);
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("appointments")
    .update({ status: "missed" })
    .eq("id", appointmentId)
    .eq("clinic_id", staff.clinic_id)
    .in("status", ["booked", "waiting", "in_room"]);
  if (error) return { ok: false as const };
  revalidatePath("/today");
  return { ok: true as const };
}
