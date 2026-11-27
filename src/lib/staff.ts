import "server-only";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { readToken } from "@/lib/signed";
import { DEMO_COOKIE, isDemoEmail } from "@/lib/demo";

export type Role = "attender" | "doctor" | "admin";
export type Staff = {
  id: string;
  clinic_id: string;
  name: string;
  role: Role;
  clinic: {
    id: string;
    name: string;
    slug: string;
    slots_per_day: number;
    opening_time: string;
    closing_time: string;
    upi_id: string | null;
    default_fee: number;
  };
  /** Set only for a 5-minute demo login: when it ends (unix seconds). */
  demo?: { exp: number };
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
  let demo: Staff["demo"];
  if (isDemoEmail(user.email)) {
    // A demo login works only with a valid, signed, unexpired demo cookie for this same user.
    const tok = readToken<{ uid: string; exp: number }>((await cookies()).get(DEMO_COOKIE)?.value);
    if (!tok || tok.uid !== user.id) return null;
    demo = { exp: tok.exp };
  }
  const { data } = await supabase
    .from("users")
    .select("id, clinic_id, name, role, active, clinic:clinics(id, name, slug, slots_per_day, opening_time, closing_time, upi_id, default_fee)")
    .eq("id", user.id)
    .maybeSingle();
  if (!data || !data.active || !data.clinic) return null;
  return { ...(data as unknown as Staff), ...(demo ? { demo } : {}) };
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
