"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { makeToken } from "@/lib/signed";
import { clientIp, hashIp } from "@/lib/otp-guard";
import { cleanRef, DEMO_COOKIE, DEMO_ROLES, DEMO_SECONDS, type DemoRole } from "@/lib/demo";
import { DEMO_USERS, ensureDemoClinic, ensureDemoUser, refreshDemoData } from "@/lib/demo-server";
import { ROLE_HOME } from "@/lib/staff";

/** Demo starts allowed per device/IP in 24 hours, and for the whole site per day (cost and abuse guard). */
const PER_IP_PER_DAY = 4;
const SITE_PER_DAY = 300;

export type DemoState = { error?: "limit" | "busy" | "failed" };

/** "Start 5-minute demo": signs the visitor in to the demo clinic for exactly 5 minutes. */
export async function startDemo(_prev: DemoState, form: FormData): Promise<DemoState> {
  const role = String(form.get("role") ?? "doctor") as DemoRole;
  if (!DEMO_ROLES.includes(role)) return { error: "failed" };
  const ref = cleanRef(form.get("ref"));
  const db = supabaseAdmin();

  const ipHash = hashIp(await clientIp()) ?? "unknown";
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const [mine, all] = await Promise.all([
    db.from("demo_sessions").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("started_at", dayAgo),
    db.from("demo_sessions").select("id", { count: "exact", head: true }).gte("started_at", dayAgo),
  ]);
  if (mine.error || all.error) {
    console.error("[demo] demo_sessions table missing? Run the live demo SQL.", mine.error?.message ?? all.error?.message);
    return { error: "failed" };
  }
  if ((mine.count ?? 0) >= PER_IP_PER_DAY) return { error: "limit" };
  if ((all.count ?? 0) >= SITE_PER_DAY) return { error: "busy" };

  try {
    const clinicId = await ensureDemoClinic(db);
    if (!clinicId) return { error: "failed" };
    const userId = await ensureDemoUser(db, clinicId, role);
    const doctorId = role === "doctor" ? userId : await ensureDemoUser(db, clinicId, "doctor");
    if (!userId) return { error: "failed" };
    await refreshDemoData(db, clinicId, doctorId).catch((e) => console.error("[demo] refresh", e));

    // A one-time sign-in link made on the server and used right here: no password, no email sent.
    const link = await db.auth.admin.generateLink({ type: "magiclink", email: DEMO_USERS[role].email });
    const tokenHash = link.data.properties?.hashed_token;
    if (!tokenHash) return { error: "failed" };
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash });
    if (error) {
      console.error("[demo] sign-in", error.message);
      return { error: "failed" };
    }

    const exp = Math.floor(Date.now() / 1000) + DEMO_SECONDS;
    (await cookies()).set(DEMO_COOKIE, makeToken({ uid: userId, role }, DEMO_SECONDS), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: DEMO_SECONDS,
    });
    await db.from("demo_sessions").insert({ role, ip_hash: ipHash, ref, expires_at: new Date(exp * 1000).toISOString() });
  } catch (e) {
    console.error("[demo] start failed", e instanceof Error ? e.message : e);
    return { error: "failed" };
  }
  redirect(ROLE_HOME[role]);
}
