import "server-only";
import { aiAllowed, type PlanState } from "@/lib/plans";
import { getPlanState } from "@/lib/subscription";
import { supabaseAdmin } from "@/lib/supabase/server";
import { DEMO_CLINIC_SLUG } from "@/lib/demo";

async function isDemoClinic(clinicId: string): Promise<boolean> {
  const { data } = await supabaseAdmin().from("clinics").select("slug").eq("id", clinicId).maybeSingle();
  return data?.slug === DEMO_CLINIC_SLUG;
}

// The single gate in front of every paid AI call (Claude). Every server action that calls
// summarizePatient() or askManager() must go through requireProAI() first; a test checks this.
// Result: a Basic clinic can never cost us an AI rupee, even if someone calls the action directly.

export type AiGate = { ok: true; plan: PlanState } | { ok: false; reason: "ai_off" | "pro"; plan?: PlanState };

export async function requireProAI(clinicId: string): Promise<AiGate> {
  const { aiConfigured } = await import("@/lib/ai");
  if (!aiConfigured()) return { ok: false, reason: "ai_off" };
  if (await isDemoClinic(clinicId)) return { ok: false, reason: "pro" }; // the public demo never spends AI money
  const plan = await getPlanState(clinicId);
  if (!aiAllowed(plan)) return { ok: false, reason: "pro", plan };
  return { ok: true, plan };
}
