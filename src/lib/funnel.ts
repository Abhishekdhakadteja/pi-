// The doctor journey (/start): a 60-second "clinic check-up" that turns the doctor's own numbers
// into what they lose today, the plan that fits, and what it pays back. Pure and client-safe.
//
// Honest by design: every number is an ESTIMATE from the doctor's own inputs and the fixed,
// conservative assumptions below, and the page shows the formula. No fake timers or fake reviews;
// the only deadline shown is the real LAUNCH_OFFER_ENDS from plans.ts.

import { LAUNCH_OFFER_ENDS, PLANS, type PlanId } from "./plans";

export const WORK_DAYS = 26;
/** Share of visits where the doctor asks the patient to come back (follow-up / review). */
export const FOLLOWUP_SHARE = 0.35;
/** Share of those follow-ups who do not come back without a reminder. Higher if the doctor says it is a problem. */
export const MISSED_SHARE = { usual: 0.25, problem: 0.4 } as const;
/** Share of missed follow-ups that a timely WhatsApp reminder brings back. */
export const REMINDER_RECOVERY = 0.35;
/** Share of collection that goes unrecorded when accounts are kept by hand. */
export const CASH_LEAK = 0.02;
/** Share of daily admin time (register, slips, totals) the app takes over. */
export const ADMIN_SAVED = 0.6;

export type Pain = "followups" | "paperwork" | "queue" | "accounts" | "staff";
export const PAINS: Pain[] = ["followups", "paperwork", "queue", "accounts", "staff"];

export type CheckupInput = {
  patientsPerDay: number;
  fee: number;
  adminHoursPerDay: number;
  pains: Pain[];
};

export type CheckupResult = {
  visitsPerMonth: number;
  missedFollowups: number;
  recoveredPatients: number;
  recoveredRupees: number;
  cashLeakRupees: number;
  hoursSaved: number;
  totalRupees: number;
  plan: PlanId;
  /** price for the first month of the recommended plan */
  firstMonthPrice: number;
  monthPrice: number;
  /** patients (at their fee) that pay for the first month */
  paybackPatients: number;
  /** how many times the plan's monthly price the doctor gets back */
  returnMultiple: number;
  offerEnds: string;
};

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(x) ? x : lo));

export function recommendPlan(i: CheckupInput): PlanId {
  const n = clamp(i.patientsPerDay, 1, 500);
  if (i.pains.includes("staff") || n >= 80) return "pro_max";
  if (n >= 15 || i.pains.includes("followups") || i.adminHoursPerDay >= 2) return "pro";
  return "basic";
}

export function checkup(i: CheckupInput): CheckupResult {
  const n = clamp(Math.round(i.patientsPerDay), 1, 500);
  const fee = clamp(Math.round(i.fee), 50, 5000);
  const hours = clamp(i.adminHoursPerDay, 0, 12);
  const visitsPerMonth = n * WORK_DAYS;
  const missed = visitsPerMonth * FOLLOWUP_SHARE * (i.pains.includes("followups") ? MISSED_SHARE.problem : MISSED_SHARE.usual);
  const recoveredPatients = Math.round(missed * REMINDER_RECOVERY);
  const recoveredRupees = recoveredPatients * fee;
  const cashLeakRupees = i.pains.includes("accounts") ? Math.round((visitsPerMonth * fee * CASH_LEAK) / 100) * 100 : 0;
  const hoursSaved = Math.round(hours * ADMIN_SAVED * WORK_DAYS);
  const plan = recommendPlan(i);
  const p = PLANS[plan];
  const firstMonthPrice = p.firstMonth ?? p.month;
  const totalRupees = Math.round((recoveredRupees + cashLeakRupees) / 100) * 100;
  return {
    visitsPerMonth,
    missedFollowups: Math.round(missed),
    recoveredPatients,
    recoveredRupees,
    cashLeakRupees,
    hoursSaved,
    totalRupees,
    plan,
    firstMonthPrice,
    monthPrice: p.month,
    paybackPatients: Math.max(1, Math.ceil(firstMonthPrice / fee)),
    returnMultiple: Math.max(0, Math.floor(totalRupees / p.month)),
    offerEnds: LAUNCH_OFFER_ENDS,
  };
}

export const PLAN_NAME: Record<PlanId, string> = { basic: "Basic", pro: "AI Pro", pro_max: "Pro Max" };

export function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

/** Days left until the real launch-offer end (0 when over). */
export function offerDaysLeft(now: Date = new Date()): number {
  const end = new Date(`${LAUNCH_OFFER_ENDS}T23:59:59+05:30`).getTime();
  return Math.max(0, Math.ceil((end - now.getTime()) / 86_400_000));
}

/** Funnel steps, in order. Used for tracking and for the owner's drop-off view. */
export const FUNNEL_STEPS = ["start", "numbers", "pains", "result", "demo", "webinar", "offer", "whatsapp", "signup"] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];
export function isFunnelStep(x: unknown): x is FunnelStep {
  return typeof x === "string" && (FUNNEL_STEPS as readonly string[]).includes(x);
}
