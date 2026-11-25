"use server";
import { revalidatePath } from "next/cache";
import { assertRole } from "@/lib/staff";
import { supabaseServer } from "@/lib/supabase/server";
import { isBuyablePlan, isCycle, PLANS } from "@/lib/plans";
import { createRazorpayOrder, fulfilOrder, getPlanState, hasPaidBefore, razorpayConfigured } from "@/lib/subscription";
import { verifyCheckoutSignature } from "@/lib/razorpay-sign";

type Err = "not_allowed" | "trial_used" | "offline" | "bad_plan" | "failed";

/** Doctor or admin starts the free 14-day Pro trial (once per clinic, enforced in the database). */
export async function startProTrial(): Promise<{ ok: true } | { ok: false; error: Err }> {
  try {
    await assertRole(["doctor", "admin"]);
  } catch {
    return { ok: false, error: "not_allowed" };
  }
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("start_pro_trial");
  if (error) return { ok: false, error: error.message.includes("already") ? "trial_used" : "failed" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export type CheckoutInfo = { orderId: string; amount: number; keyId: string; description: string };

/** Creates a Razorpay order for the chosen plan. Only when Razorpay keys are set in Netlify. */
export async function createProOrder(plan: string, cycle: string): Promise<{ ok: true; checkout: CheckoutInfo } | { ok: false; error: Err }> {
  let staff;
  try {
    staff = await assertRole(["doctor", "admin"]);
  } catch {
    return { ok: false, error: "not_allowed" };
  }
  if (!razorpayConfigured()) return { ok: false, error: "offline" };
  if (!isBuyablePlan(plan) || !isCycle(cycle)) return { ok: false, error: "bad_plan" };
  if (plan === "basic") {
    // Basic has no first-month offer, and a clinic already on paid Pro does not need Basic.
    if (cycle === "first_month") return { ok: false, error: "bad_plan" };
    const st = await getPlanState(staff.clinic_id);
    if (st.pro && !st.trial) return { ok: false, error: "bad_plan" };
  }
  if (cycle === "first_month") {
    // 90% off is only for a clinic's very first Pro month.
    if (PLANS[plan].firstMonth == null || (await hasPaidBefore(staff.clinic_id))) return { ok: false, error: "bad_plan" };
  }
  try {
    const o = await createRazorpayOrder(staff.clinic_id, plan, cycle);
    const label = cycle === "year" ? "12 months" : "1 month";
    return { ok: true, checkout: { ...o, description: `${plan === "basic" ? "Clinic Easy Basic" : PLANS[plan].name} · ${label}` } };
  } catch (e) {
    console.error("[pro] order failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "failed" };
  }
}

/** Called by the Razorpay checkout after payment. Verifies the signature, then switches Pro on. */
export async function confirmProPayment(orderId: string, paymentId: string, signature: string): Promise<{ ok: boolean }> {
  let staff;
  try {
    staff = await assertRole(["doctor", "admin"]);
  } catch {
    return { ok: false };
  }
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim() ?? "";
  if (!verifyCheckoutSignature(orderId, paymentId, signature, secret)) return { ok: false };
  const r = await fulfilOrder(orderId, paymentId, staff.clinic_id);
  revalidatePath("/", "layout");
  return { ok: r.ok };
}
