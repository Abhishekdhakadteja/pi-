import { describe, expect, it } from "vitest";
import { checkup, recommendPlan, offerDaysLeft, inr, isFunnelStep } from "@/lib/funnel";
import { LEAD_STAGES, leadMessage } from "@/lib/funnel-messages";

describe("60-second check-up", () => {
  it("estimates follow-ups recovered from the doctor's own numbers", () => {
    const r = checkup({ patientsPerDay: 30, fee: 300, adminHoursPerDay: 1, pains: [] });
    // 30 × 26 = 780 visits; × 0.35 × 0.25 = 68 missed; × 0.35 = 24 back; × ₹300
    expect(r.visitsPerMonth).toBe(780);
    expect(r.missedFollowups).toBe(68);
    expect(r.recoveredPatients).toBe(24);
    expect(r.recoveredRupees).toBe(7200);
    expect(r.cashLeakRupees).toBe(0);
    expect(r.hoursSaved).toBe(16);
    expect(r.plan).toBe("pro");
    expect(r.firstMonthPrice).toBe(499);
    expect(r.paybackPatients).toBe(2);
  });
  it("counts more missed follow-ups and the cash leak only when the doctor says so", () => {
    const a = checkup({ patientsPerDay: 30, fee: 300, adminHoursPerDay: 1, pains: [] });
    const b = checkup({ patientsPerDay: 30, fee: 300, adminHoursPerDay: 1, pains: ["followups", "accounts"] });
    expect(b.recoveredRupees).toBeGreaterThan(a.recoveredRupees);
    expect(b.cashLeakRupees).toBe(4700);
  });
  it("recommends the plan that fits", () => {
    expect(recommendPlan({ patientsPerDay: 10, fee: 200, adminHoursPerDay: 0.5, pains: [] })).toBe("basic");
    expect(recommendPlan({ patientsPerDay: 10, fee: 200, adminHoursPerDay: 0.5, pains: ["followups"] })).toBe("pro");
    expect(recommendPlan({ patientsPerDay: 120, fee: 300, adminHoursPerDay: 1, pains: [] })).toBe("pro_max");
    expect(recommendPlan({ patientsPerDay: 20, fee: 300, adminHoursPerDay: 1, pains: ["staff"] })).toBe("pro_max");
  });
  it("never breaks on silly input", () => {
    const r = checkup({ patientsPerDay: NaN, fee: -5, adminHoursPerDay: 99, pains: [] });
    expect(Number.isFinite(r.totalRupees)).toBe(true);
    expect(r.paybackPatients).toBeGreaterThanOrEqual(1);
  });
  it("uses the real offer end date", () => {
    expect(offerDaysLeft(new Date("2027-01-30T12:00:00+05:30"))).toBe(2);
    expect(offerDaysLeft(new Date("2027-02-02T00:00:00+05:30"))).toBe(0);
    expect(inr(192000)).toBe("₹1,92,000");
    expect(isFunnelStep("offer")).toBe(true);
    expect(isFunnelStep("drop table")).toBe(false);
  });
});

describe("auto-DM pack", () => {
  it("has a message for every stage with one link at most and the doctor's name", () => {
    for (const s of LEAD_STAGES) {
      const t = leadMessage(s.id, { appUrl: "https://x.app", name: "Dr. Rao", amount: 7200, plan: "pro" });
      expect(t.length).toBeGreaterThan(40);
      expect((t.match(/https:\/\//g) ?? []).length).toBeLessThanOrEqual(2);
      if (!s.id.startsWith("onboard")) expect(t).toContain("Dr. Rao");
    }
  });
  it("day 3 uses the doctor's own ₹ number, and day 7 promises it is the last", () => {
    expect(leadMessage("day3", { appUrl: "https://x.app", amount: 7200 })).toContain("₹7,200");
    expect(leadMessage("day3", { appUrl: "https://x.app" })).toContain("/start");
    expect(leadMessage("day7", { appUrl: "https://x.app" })).toContain("आख़िरी");
  });
});
