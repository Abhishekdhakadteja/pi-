import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { amountPaise, extendPlan, planState, type ClinicPlanRow, type Cycle, type PaidPlanId, type PlanState } from "@/lib/plans";

// Clinic Easy Pro: reading a clinic's plan, Razorpay orders, and switching Pro on after payment.
// Razorpay is key-gated like the other paid services: it switches on when RAZORPAY_KEY_ID and
// RAZORPAY_KEY_SECRET are set in Netlify. Until then doctors buy Pro on WhatsApp and the owner
// switches it on from the /owner page.

const PLAN_COLS = "plan, plan_until, pro_trial_ends_at, pro_trial_used";

export function razorpayConfigured(): boolean {
  return !!process.env.RAZORPAY_KEY_ID?.trim() && !!process.env.RAZORPAY_KEY_SECRET?.trim();
}

/**
 * The clinic's plan row. If the Pro database update has not been run yet the columns do not
 * exist; then every clinic is simply Basic and nothing else breaks.
 */
export async function getClinicPlanRow(clinicId: string): Promise<ClinicPlanRow | null> {
  const { data, error } = await supabaseAdmin().from("clinics").select(PLAN_COLS).eq("id", clinicId).maybeSingle();
  if (error) return null;
  return data as ClinicPlanRow | null;
}

export async function getPlanState(clinicId: string, now: Date = new Date()): Promise<PlanState> {
  return planState(await getClinicPlanRow(clinicId), now);
}

/** Pro state for many clinics at once (the reminder job). Missing columns -> all Basic. */
export async function proClinicIds(clinicIds: string[], now: Date = new Date()): Promise<Set<string>> {
  if (clinicIds.length === 0) return new Set();
  const { data, error } = await supabaseAdmin().from("clinics").select(`id, ${PLAN_COLS}`).in("id", clinicIds);
  if (error || !data) return new Set();
  return new Set((data as (ClinicPlanRow & { id: string })[]).filter((r) => planState(r, now).pro).map((r) => r.id));
}

/** Has this clinic ever paid? The 90%-off first month is for new Pro clinics only. */
export async function hasPaidBefore(clinicId: string): Promise<boolean> {
  const { count } = await supabaseAdmin()
    .from("subscription_payments")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId)
    .eq("status", "paid");
  return (count ?? 0) > 0;
}

export type NewOrder = { orderId: string; amount: number; keyId: string };

export async function createRazorpayOrder(clinicId: string, plan: PaidPlanId, cycle: Cycle, fetcher: typeof fetch = fetch): Promise<NewOrder> {
  const keyId = process.env.RAZORPAY_KEY_ID!.trim();
  const secret = process.env.RAZORPAY_KEY_SECRET!.trim();
  const amount = amountPaise(plan, cycle);
  const res = await fetcher("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      amount,
      currency: "INR",
      receipt: `ce_${clinicId.slice(0, 8)}_${Date.now()}`,
      notes: { clinic_id: clinicId, plan, cycle },
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; error?: { description?: string } };
  if (!res.ok || !data.id) throw new Error(`razorpay_order: ${data.error?.description ?? res.status}`);
  const { error } = await supabaseAdmin()
    .from("subscription_payments")
    .insert({ clinic_id: clinicId, plan, cycle, amount_paise: amount, provider: "razorpay", order_id: data.id, status: "created" });
  if (error) throw new Error("order_save_failed");
  return { orderId: data.id, amount, keyId };
}

/**
 * Marks an order paid and extends the clinic's plan. Safe to call twice (checkout handler and
 * webhook): an order that is already paid is left alone.
 */
export async function fulfilOrder(orderId: string, paymentId: string, clinicId?: string): Promise<{ ok: boolean; until?: string }> {
  const db = supabaseAdmin();
  let q = db.from("subscription_payments").select("id, clinic_id, plan, cycle, status, period_end").eq("order_id", orderId);
  if (clinicId) q = q.eq("clinic_id", clinicId);
  const { data: pay } = await q.maybeSingle();
  if (!pay) return { ok: false };
  if (pay.status === "paid") return { ok: true, until: pay.period_end ?? undefined };

  // Claim the order first so two callers can never both extend the plan.
  const { data: claimed } = await db
    .from("subscription_payments")
    .update({ status: "paid", payment_id: paymentId })
    .eq("id", pay.id)
    .neq("status", "paid")
    .select("id");
  if (!claimed?.length) return { ok: true };

  const row = await getClinicPlanRow(pay.clinic_id);
  const until = extendPlan(row, pay.plan as PaidPlanId, pay.cycle as Cycle).toISOString();
  await db.from("clinics").update({ plan: pay.plan, plan_until: until }).eq("id", pay.clinic_id);
  await db.from("subscription_payments").update({ period_end: until }).eq("id", pay.id);
  await db.from("audit_log").insert({
    clinic_id: pay.clinic_id,
    action: "pro_paid",
    record_table: "subscription_payments",
    record_id: pay.id,
    details: { plan: pay.plan, cycle: pay.cycle, until },
  });
  return { ok: true, until };
}
