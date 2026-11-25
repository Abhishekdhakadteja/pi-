// Clinic Easy plans: Basic (the 7 free AI agents) and Pro / Pro Max (the paid AI services).
// Everything about price, offers, fair-use limits and our own API cost lives here, so the
// pricing page, the checkout and the tests all read the same numbers. Pure: no server code.

import type { IntegrationId } from "./integrations";

export type PlanId = "basic" | "pro" | "pro_max";
export type PaidPlanId = Exclude<PlanId, "basic">;
/** Plans a clinic can pay for online: Basic ₹499 too (it is the launch plan), plus Pro / Pro Max. */
export type BuyablePlanId = PlanId;
export type Cycle = "month" | "year" | "first_month";

/** GST added on top of every price shown (SaaS, 18%). */
export const GST_RATE = 0.18;
/** Razorpay standard fee (2%) plus 18% GST on that fee. */
export const GATEWAY_FEE = 0.02 * 1.18;
export const PRO_TRIAL_DAYS = 14;
export const BASIC_TRIAL_DAYS = 30;
/** Last day of the launch prices. Change this one line to extend or end the offer. */
export const LAUNCH_OFFER_ENDS = "2027-01-31";

/** What one unit of each paid service costs US (₹, after GST/forex), from the providers' rate cards. */
export const UNIT_COST = {
  message: 0.25, // MSG91 SMS ≈ ₹0.20-0.25; WhatsApp utility ≈ ₹0.115 + GST
  aiSummary: 1.5, // Claude, a few thousand tokens per summary
  voiceRx: 1,
  reportRead: 1.5,
  callMinute: 3.5, // Exotel/Twilio minute + AI voice
  videoMinute: 1,
  infraPerClinic: 250, // share of Supabase Pro + Netlify per clinic per month
  // Pro Max hardware kit, given free: 1 ESP32 (~₹550) + charger/case (~₹400) + 2 BLE tags
  // (~₹1,200 each, upper estimate) + setup visit/shipping (~₹650) ≈ ₹4,000, spread over 12 months.
  maxKitPerMonth: 335,
  // smartwatch health report: Health Connect is free; storage/sync share per clinic
  healthReport: 50,
} as const;

export type Quota = {
  messages: number;
  aiSummaries: number;
  voiceRx: number;
  reportReads: number;
  callMinutes: number;
  videoMinutes: number;
};

export type Plan = {
  id: PlanId;
  name: string;
  doctors: number;
  /** "MRP" per month, shown struck through */
  mrpMonth: number;
  /** launch price per month */
  month: number;
  /** price for 12 months paid at once */
  year: number;
  /** very first month for a new Pro clinic (90% off), or null */
  firstMonth: number | null;
  quota: Quota | null;
  trialDays: number;
};

export const PLANS: Record<PlanId, Plan> = {
  basic: {
    id: "basic",
    name: "Clinic Easy",
    doctors: 1,
    mrpMonth: 999,
    month: 499,
    year: 4999,
    firstMonth: null,
    quota: null,
    trialDays: BASIC_TRIAL_DAYS,
  },
  pro: {
    id: "pro",
    name: "Clinic Easy Pro",
    doctors: 1,
    mrpMonth: 4999,
    month: 2999,
    year: 29999,
    firstMonth: 499,
    quota: { messages: 1000, aiSummaries: 200, voiceRx: 200, reportReads: 60, callMinutes: 60, videoMinutes: 120 },
    trialDays: PRO_TRIAL_DAYS,
  },
  pro_max: {
    id: "pro_max",
    name: "Clinic Easy Pro Max",
    doctors: 3,
    mrpMonth: 15999,
    month: 9999,
    year: 99999,
    firstMonth: null,
    quota: { messages: 2000, aiSummaries: 400, voiceRx: 400, reportReads: 120, callMinutes: 120, videoMinutes: 240 },
    trialDays: PRO_TRIAL_DAYS,
  },
};

/** Add-ons when a Pro clinic uses more than its fair-use limit. */
export const TOP_UPS = [
  { id: "msg500", hi: "500 ऑटो मैसेज", en: "500 auto messages", price: 199 },
  { id: "call100", hi: "100 मिनट AI कॉल", en: "100 min AI calls", price: 599 },
  { id: "doctor", hi: "एक और डॉक्टर (Pro)", en: "One more doctor (Pro)", price: 1499 },
] as const;

/**
 * Everything AI and every automation needs Pro (decision 2026-11-19). Basic is the plain clinic
 * software for trying Clinic Easy out: booking, queue, 1-tap reminders, prescription, accounts.
 * So a Basic clinic costs us ₹0 in AI: no Claude call can run for it (see lib/ai-guard.ts).
 */
export const PRO_SERVICES: IntegrationId[] = [
  "auto_brief",
  "voice_typing",
  "claude",
  "msg91",
  "wa_cloud",
  "voice_call",
  "voice_rx",
  "camera",
  "video",
  "location",
  "attendance",
  "staff_tracking",
  "smartwatch",
  "abha",
  "razorpay",
];
export function isProService(id: IntegrationId): boolean {
  return PRO_SERVICES.includes(id);
}

/**
 * Pro Max only (decision 2026-11-19): the hardware tier. ESP32 staff tracking and the doctor's
 * live heart/health report. A Pro trial does NOT unlock these; only a paid Pro Max does.
 */
export const MAX_SERVICES: IntegrationId[] = ["staff_tracking", "smartwatch"];
export function isMaxService(id: IntegrationId): boolean {
  return MAX_SERVICES.includes(id);
}
/** Which plan a service needs, for the lock badge. */
export function requiredPlan(id: IntegrationId): PlanId {
  return isMaxService(id) ? "pro_max" : isProService(id) ? "pro" : "basic";
}
/** Can this clinic use the service right now? */
export function canUse(id: IntegrationId, state: Pick<PlanState, "tier" | "pro">): boolean {
  const need = requiredPlan(id);
  return need === "basic" || (need === "pro" ? state.pro : state.tier === "pro_max");
}
/** Is the clinic on Pro Max right now (paid, not a trial)? */
export function maxAllowed(state: Pick<PlanState, "tier">): boolean {
  return state.tier === "pro_max";
}

/** Can this clinic use AI right now? Only Pro, Pro Max or a running Pro trial. */
export function aiAllowed(state: Pick<PlanState, "pro">): boolean {
  return state.pro === true;
}

export const pctOff = (mrp: number, price: number) => Math.round((1 - price / mrp) * 100);

/** Price (₹, before GST) of one purchase. */
export function priceOf(plan: BuyablePlanId, cycle: Cycle): number {
  const p = PLANS[plan];
  if (cycle === "year") return p.year;
  if (cycle === "first_month") {
    if (p.firstMonth == null) throw new Error("no first-month offer on this plan");
    return p.firstMonth;
  }
  return p.month;
}

/** Amount Razorpay charges, in paise, GST included. */
export function amountPaise(plan: BuyablePlanId, cycle: Cycle): number {
  return Math.round(priceOf(plan, cycle) * (1 + GST_RATE) * 100);
}

/** Our cost for one clinic in a month, if it uses `usage` (0..1) of its fair-use limit. */
export function monthlyCost(plan: PaidPlanId, usage = 1): number {
  const q = PLANS[plan].quota!;
  const services =
    q.messages * UNIT_COST.message +
    q.aiSummaries * UNIT_COST.aiSummary +
    q.voiceRx * UNIT_COST.voiceRx +
    q.reportReads * UNIT_COST.reportRead +
    q.callMinutes * UNIT_COST.callMinute +
    q.videoMinutes * UNIT_COST.videoMinute;
  const hardware = plan === "pro_max" ? UNIT_COST.maxKitPerMonth + UNIT_COST.healthReport : 0;
  return Math.round(UNIT_COST.infraPerClinic + hardware + services * usage);
}

/** Profit per clinic per month at a given monthly revenue (GST excluded: it goes to the government). */
export function monthlyProfit(plan: PaidPlanId, revenuePerMonth: number, usage = 1) {
  const cost = monthlyCost(plan, usage) + Math.round(revenuePerMonth * (1 + GST_RATE) * GATEWAY_FEE);
  const profit = revenuePerMonth - cost;
  return { revenue: revenuePerMonth, cost, profit, margin: Math.round((profit / revenuePerMonth) * 100) };
}

// ---------------------------------------------------------------- plan state of a clinic

export type ClinicPlanRow = {
  plan?: string | null;
  plan_until?: string | null;
  pro_trial_ends_at?: string | null;
  pro_trial_used?: boolean | null;
};

export type PlanState = {
  /** what the clinic can use right now */
  tier: PlanId;
  pro: boolean;
  trial: boolean;
  /** days left on the trial or on the paid period (null for Basic) */
  daysLeft: number | null;
  until: string | null;
  canStartTrial: boolean;
  /** the paid plan has run out */
  expired: boolean;
};

const DAY = 86_400_000;

export function planState(row: ClinicPlanRow | null | undefined, now: Date = new Date()): PlanState {
  const paidPlan = row?.plan === "pro" || row?.plan === "pro_max" ? (row.plan as PaidPlanId) : null;
  const paidUntil = row?.plan_until ? new Date(row.plan_until) : null;
  const trialEnd = row?.pro_trial_ends_at ? new Date(row.pro_trial_ends_at) : null;
  const paidOn = !!paidPlan && !!paidUntil && paidUntil > now;
  const trialOn = !paidOn && !!trialEnd && trialEnd > now;
  const until = paidOn ? paidUntil : trialOn ? trialEnd : null;
  return {
    tier: paidOn ? paidPlan! : trialOn ? "pro" : "basic",
    pro: paidOn || trialOn,
    trial: trialOn,
    daysLeft: until ? Math.max(1, Math.ceil((until.getTime() - now.getTime()) / DAY)) : null,
    until: until ? until.toISOString() : null,
    canStartTrial: !paidOn && !row?.pro_trial_used,
    expired: !!paidPlan && !paidOn,
  };
}

/** New paid-until date after a purchase. Renewing the same plan stacks on the time left. */
export function extendPlan(row: ClinicPlanRow | null | undefined, plan: BuyablePlanId, cycle: Cycle, now: Date = new Date()): Date {
  const current = row?.plan_until ? new Date(row.plan_until) : null;
  const start = row?.plan === plan && current && current > now ? current : now;
  const end = new Date(start);
  if (cycle === "year") end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return end;
}

export function isPaidPlan(x: unknown): x is PaidPlanId {
  return x === "pro" || x === "pro_max";
}
export function isBuyablePlan(x: unknown): x is BuyablePlanId {
  return x === "basic" || isPaidPlan(x);
}
export function isCycle(x: unknown): x is Cycle {
  return x === "month" || x === "year" || x === "first_month";
}
