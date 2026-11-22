"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { assertRole } from "@/lib/staff";
import { todayIST } from "@/lib/dates";

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

/** A patient who booked from home has reached the clinic: booked -> waiting (today only). */
export async function markArrived(appointmentId: string) {
  const staff = await assertRole(["attender", "doctor", "admin"]);
  if (!/^[0-9a-f-]{36}$/.test(appointmentId)) return { ok: false as const };
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("appointments")
    .update({ status: "waiting" })
    .eq("id", appointmentId)
    .eq("clinic_id", staff.clinic_id)
    .eq("date", todayIST())
    .eq("status", "booked");
  if (error) return { ok: false as const };
  revalidatePath("/today");
  revalidatePath("/doctor");
  return { ok: true as const };
}
