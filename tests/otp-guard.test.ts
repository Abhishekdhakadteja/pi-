import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
const { otpLimited, OTP_LIMITS, turnstileOk } = await import("@/lib/otp-guard");

const zero = { phone10: 0, phoneDay: 0, ip10: 0, ipDay: 0, clinicHour: 0, clinicDay: 0 };

describe("OTP abuse limits", () => {
  it("allows a normal patient", () => {
    expect(otpLimited({ ...zero, phone10: 1, ip10: 1, clinicHour: 5 })).toBe(false);
  });
  it("stops each kind of flood", () => {
    expect(otpLimited({ ...zero, phone10: OTP_LIMITS.phonePer10Min })).toBe(true);
    expect(otpLimited({ ...zero, phoneDay: OTP_LIMITS.phonePerDay })).toBe(true);
    expect(otpLimited({ ...zero, ip10: OTP_LIMITS.ipPer10Min })).toBe(true);
    expect(otpLimited({ ...zero, ipDay: OTP_LIMITS.ipPerDay })).toBe(true);
    expect(otpLimited({ ...zero, clinicHour: OTP_LIMITS.clinicPerHour })).toBe(true);
    expect(otpLimited({ ...zero, clinicDay: OTP_LIMITS.clinicPerDay })).toBe(true);
  });
  it("Turnstile is a no-op until its secret key is set", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    expect(await turnstileOk(undefined, null)).toBe(true);
    process.env.TURNSTILE_SECRET_KEY = "x";
    expect(await turnstileOk("", null)).toBe(false);
    delete process.env.TURNSTILE_SECRET_KEY;
  });
});
