"use server";
import { revalidatePath } from "next/cache";
import { assertRole } from "@/lib/staff";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getPlanState } from "@/lib/subscription";
import { audit } from "@/lib/audit";

const KNOWLEDGE_MAX = 4000;

/**
 * "AI को सिखाएँ": the clinic's own notes that the AI मैनेजर reads (Pro). This is how a clinic
 * teaches its AI. It is not model training: the text is only given to the AI with each question.
 * Patients' personal details must not be written here (the form says so).
 */
export async function saveKnowledge(text: string): Promise<{ ok: true } | { ok: false; error: "pro" | "db" | "long" }> {
  const staff = await assertRole(["admin", "doctor"]);
  if (!(await getPlanState(staff.clinic_id)).pro) return { ok: false, error: "pro" };
  const clean = String(text ?? "").replace(/\r/g, "").trim();
  if (clean.length > KNOWLEDGE_MAX) return { ok: false, error: "long" };
  // Service role, scoped to the staff member's own clinic (the plan-protect trigger is unaffected).
  const { error } = await supabaseAdmin()
    .from("clinics")
    .update({ ai_knowledge: clean || null })
    .eq("id", staff.clinic_id);
  if (error) return { ok: false, error: "db" };
  await audit(staff, "ai_knowledge_saved", "clinics", staff.clinic_id, { chars: clean.length });
  revalidatePath("/ai");
  return { ok: true };
}
