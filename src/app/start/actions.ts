"use server";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/server-env";
import { cleanRef } from "@/lib/demo";
import { isFunnelStep } from "@/lib/funnel";

/** Records that an anonymous visitor reached a journey step (once per visitor and step). Never throws. */
export async function trackStep(step: string, visitor: string, ref?: string | null, plan?: string | null): Promise<void> {
  if (!isFunnelStep(step) || typeof visitor !== "string" || visitor.length < 8 || visitor.length > 64) return;
  try {
    const v = createHash("sha256").update(`v:${visitor}:${serverEnv.patientSessionSecret()}`).digest("hex").slice(0, 32);
    const p = plan === "basic" || plan === "pro" || plan === "pro_max" ? plan : null;
    await supabaseAdmin()
      .from("funnel_events")
      .upsert({ step, visitor: v, ref: cleanRef(ref), plan: p }, { onConflict: "visitor,step", ignoreDuplicates: true });
  } catch {
    // tracking must never break the page
  }
}
