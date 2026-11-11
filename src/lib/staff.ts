import "server-only";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export type Role = "attender" | "doctor" | "admin";
export type Staff = {
  id: string;
  clinic_id: string;
  name: string;
  role: Role;
  clinic: { id: string; name: string; slug: string; slots_per_day: number; opening_time: string; closing_time: string };
};

export const ROLE_HOME: Record<Role, string> = {
  attender: "/desk",
  doctor: "/doctor",
  admin: "/admin",
};

/** Returns the logged-in staff member, or null. */
export async function getStaff(): Promise<Staff | null> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("users")
    .select("id, clinic_id, name, role, active, clinic:clinics(id, name, slug, slots_per_day, opening_time, closing_time)")
    .eq("id", user.id)
    .maybeSingle();
  if (!data || !data.active || !data.clinic) return null;
  return data as unknown as Staff;
}

/** Use at the top of every staff page. Sends the user away if the role is not allowed. */
export async function requireRole(allowed: Role[]): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect("/login");
  if (!allowed.includes(staff.role)) redirect(`${ROLE_HOME[staff.role]}?denied=1`);
  return staff;
}

/** Same check for server actions: throws instead of redirecting. */
export async function assertRole(allowed: Role[]): Promise<Staff> {
  const staff = await getStaff();
  if (!staff || !allowed.includes(staff.role)) throw new Error("err_not_allowed");
  return staff;
}
