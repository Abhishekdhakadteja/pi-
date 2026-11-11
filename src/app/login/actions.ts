"use server";
import { redirect } from "next/navigation";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/validate";
import { ROLE_HOME, type Role } from "@/lib/staff";

export type LoginState = { error?: "loginFailed" | "noStaffProfile" | "err_generic" };

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
    if (!data?.email) return { error: "loginFailed" };
    email = data.email;
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email!, password });
  if (error || !data.user) return { error: "loginFailed" };

  const { data: profile } = await supabase.from("users").select("role, active").eq("id", data.user.id).maybeSingle();
  if (!profile?.active) {
    await supabase.auth.signOut();
    return { error: "noStaffProfile" };
  }
  redirect(ROLE_HOME[profile.role as Role]);
}

export async function logout() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
