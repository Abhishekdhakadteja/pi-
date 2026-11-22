"use server";
import { redirect } from "next/navigation";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/validate";
import { ROLE_HOME, type Role } from "@/lib/staff";

export type LoginState = { error?: "loginFailed" | "noStaffProfile" | "pendingSignup" | "err_generic" };

/** Is this login part of a self sign-up that is not verified yet? (Column missing before the sign-up SQL: no.) */
async function isPendingSignup(where: { phone?: string; id?: string }): Promise<boolean> {
  const db = supabaseAdmin();
  const q = db.from("users").select("clinic_id, active").limit(1);
  const { data: u } = await (where.phone ? q.eq("phone", where.phone) : q.eq("id", where.id!)).maybeSingle();
  if (!u || u.active) return false;
  const { data: c, error } = await db.from("clinics").select("signup_status").eq("id", u.clinic_id).maybeSingle();
  return !error && c?.signup_status === "pending";
}

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const id = String(form.get("id") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!id || !password) return { error: "loginFailed" };

  let email = id.includes("@") ? id.toLowerCase() : null;
  if (!email) {
    // Phone login: find the staff email for this phone (server side only).
    const phone = normalizePhone(id);
    if (!phone) return { error: "loginFailed" };
    const { data } = await supabaseAdmin().from("users").select("email").eq("phone", phone).eq("active", true).maybeSingle();
    if (!data?.email) return { error: (await isPendingSignup({ phone })) ? "pendingSignup" : "loginFailed" };
    email = data.email;
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email!, password });
  if (error || !data.user) return { error: "loginFailed" };

  const { data: profile } = await supabase.from("users").select("role, active").eq("id", data.user.id).maybeSingle();
  if (!profile?.active) {
    await supabase.auth.signOut();
    return { error: (await isPendingSignup({ id: data.user.id })) ? "pendingSignup" : "noStaffProfile" };
  }
  redirect(ROLE_HOME[profile.role as Role]);
}

export async function logout() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
