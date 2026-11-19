import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import {
  PLANS,
  PRO_SERVICES,
  amountPaise,
  extendPlan,
  isProService,
  monthlyCost,
  monthlyProfit,
  pctOff,
  planState,
  priceOf,
} from "@/lib/plans";
import { INTEGRATIONS } from "@/lib/integrations";
import { checkoutSignature, verifyCheckoutSignature, verifyWebhookSignature } from "@/lib/razorpay-sign";
import { BASIC_FEATURES, PRO_FEATURES, getProWords } from "@/lib/pro-content";

const NOW = new Date("2026-11-18T12:00:00Z");
const inDays = (d: number) => new Date(NOW.getTime() + d * 86_400_000).toISOString();

describe("Pro plan state", () => {
  it("a clinic with no plan data is Basic and may start the trial", () => {
    const s = planState(null, NOW);
    expect(s).toMatchObject({ tier: "basic", pro: false, trial: false, canStartTrial: true, expired: false, daysLeft: null });
  });
  it("a running trial gives Pro with days left", () => {
    const s = planState({ plan: "basic", pro_trial_ends_at: inDays(10), pro_trial_used: true }, NOW);
    expect(s).toMatchObject({ tier: "pro", pro: true, trial: true, daysLeft: 10, canStartTrial: false });
  });
  it("an ended trial is Basic and cannot be started again", () => {
    const s = planState({ plan: "basic", pro_trial_ends_at: inDays(-1), pro_trial_used: true }, NOW);
    expect(s).toMatchObject({ tier: "basic", pro: false, canStartTrial: false });
  });
  it("a paid plan wins over a trial and expires on time", () => {
    expect(planState({ plan: "pro_max", plan_until: inDays(30), pro_trial_ends_at: inDays(5) }, NOW)).toMatchObject({
      tier: "pro_max",
      trial: false,
      daysLeft: 30,
    });
    expect(planState({ plan: "pro", plan_until: inDays(-2) }, NOW)).toMatchObject({ tier: "basic", pro: false, expired: true });
  });
  it("renewing the same plan stacks; a new plan starts today", () => {
    const row = { plan: "pro", plan_until: "2026-12-10T00:00:00.000Z" };
    expect(extendPlan(row, "pro", "month", NOW).toISOString()).toBe("2027-01-10T00:00:00.000Z");
    expect(extendPlan(row, "pro", "year", NOW).toISOString()).toBe("2027-12-10T00:00:00.000Z");
    expect(extendPlan(row, "pro_max", "month", NOW).toISOString()).toBe("2026-12-18T12:00:00.000Z");
    expect(extendPlan(null, "pro", "first_month", NOW).toISOString()).toBe("2026-12-18T12:00:00.000Z");
  });
});

describe("Pro pricing", () => {
  it("shows the launch discounts we advertise", () => {
    expect(pctOff(PLANS.pro.mrpMonth, PLANS.pro.month)).toBe(40);
    expect(pctOff(PLANS.pro.mrpMonth, PLANS.pro.firstMonth!)).toBe(90);
    expect(pctOff(PLANS.pro.mrpMonth * 12, PLANS.pro.year)).toBe(50);
    expect(pctOff(PLANS.pro_max.mrpMonth, PLANS.pro_max.month)).toBe(40);
    expect(pctOff(PLANS.basic.mrpMonth, PLANS.basic.month)).toBe(50);
  });
  it("charges GST on top, in paise", () => {
    expect(amountPaise("pro", "month")).toBe(353_882);
    expect(amountPaise("pro", "first_month")).toBe(58_882);
    expect(amountPaise("pro", "year")).toBe(3_539_882);
    expect(() => priceOf("pro_max", "first_month")).toThrow();
  });
  it("keeps at least ~45% margin even if a clinic uses its full fair-use limit", () => {
    expect(monthlyProfit("pro", PLANS.pro.month).margin).toBeGreaterThanOrEqual(45);
    expect(monthlyProfit("pro", PLANS.pro.year / 12).margin).toBeGreaterThanOrEqual(35);
    expect(monthlyProfit("pro_max", PLANS.pro_max.month).margin).toBeGreaterThanOrEqual(45);
  });
  it("earns about ₹5,000 a month from a Pro Max doctor at full price and normal use", () => {
    expect(monthlyProfit("pro_max", PLANS.pro_max.mrpMonth, 0.4).profit).toBeGreaterThan(8000);
    expect(monthlyProfit("pro", PLANS.pro.mrpMonth, 0.4).profit).toBeGreaterThan(4000);
    expect(monthlyCost("pro", 0)).toBe(250);
  });
});

describe("what needs Pro", () => {
  it("Basic keeps the 5 plain tools; AI agents and every paid service need Pro", () => {
    const free = INTEGRATIONS.filter((i) => i.kind === "free");
    expect(free).toHaveLength(7);
    expect(free.filter((i) => !isProService(i.id)).map((i) => i.id)).toEqual(["booking", "queue", "wa_link", "rx", "upi"]);
    for (const i of INTEGRATIONS.filter((x) => x.kind !== "free")) expect(isProService(i.id)).toBe(true);
    expect(PRO_SERVICES).toHaveLength(15);
  });
  it("lists the same number of features in both languages", () => {
    expect(PRO_FEATURES.hi).toHaveLength(PRO_FEATURES.en.length);
    expect(PRO_FEATURES.hi).toHaveLength(PRO_SERVICES.length);
    expect(BASIC_FEATURES.hi).toHaveLength(5);
    expect(Object.keys(getProWords("hi")).sort()).toEqual(Object.keys(getProWords("en")).sort());
  });
});

describe("Razorpay signatures", () => {
  it("accepts the right checkout signature only", () => {
    const sig = checkoutSignature("order_1", "pay_1", "secret");
    expect(verifyCheckoutSignature("order_1", "pay_1", sig, "secret")).toBe(true);
    expect(verifyCheckoutSignature("order_1", "pay_2", sig, "secret")).toBe(false);
    expect(verifyCheckoutSignature("order_1", "pay_1", sig, "other")).toBe(false);
    expect(verifyCheckoutSignature("order_1", "pay_1", "short", "secret")).toBe(false);
    expect(verifyCheckoutSignature("order_1", "pay_1", sig, "")).toBe(false);
  });
  it("checks the webhook body signature", () => {
    const body = JSON.stringify({ event: "payment.captured" });
    const sig = createHmac("sha256", "wh").update(body).digest("hex");
    expect(verifyWebhookSignature(body, sig, "wh")).toBe(true);
    expect(verifyWebhookSignature(body + " ", sig, "wh")).toBe(false);
    expect(verifyWebhookSignature(body, null, "wh")).toBe(false);
  });
});
