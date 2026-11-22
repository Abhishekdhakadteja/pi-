import { describe, expect, it } from "vitest";
import { SPECIALTIES, approvedText, maskTarget, parseSignup, pickChannel, signupRef, specialtyLabel, teamVerifyText } from "@/lib/signup";

const base: Record<string, string> = {
  doctor_name: "Dr. Amit Sharma",
  clinic_name: "Sharma Clinic",
  specialty: "ortho",
  city: " Guna ",
  phone: "+91 98765-43210",
  email: "Amit.Sharma@Gmail.com",
  password: "secret123",
  terms: "on",
  public_listing: "on",
  channel: "mobile",
};
const parse = (over: Record<string, string | undefined> = {}) => parseSignup((k) => ({ ...base, ...over })[k]);

describe("parseSignup", () => {
  it("cleans a good form", () => {
    const r = parse();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toMatchObject({
      doctorName: "Amit Sharma", // "Dr." is added by the app, not stored twice
      clinicName: "Sharma Clinic",
      specialty: "ortho",
      specialtyOther: null,
      city: "Guna",
      phone: "9876543210",
      email: "amit.sharma@gmail.com",
      publicListing: true,
      channel: "mobile",
      regNo: null,
    });
  });
  it("points at the first wrong field", () => {
    expect(parse({ doctor_name: "" })).toEqual({ ok: false, field: "doctorName" });
    expect(parse({ specialty: "magic" })).toEqual({ ok: false, field: "specialty" });
    expect(parse({ specialty: "other", specialty_other: "" })).toEqual({ ok: false, field: "specialty" });
    expect(parse({ city: "G" })).toEqual({ ok: false, field: "city" });
    expect(parse({ phone: "12345" })).toEqual({ ok: false, field: "phone" });
    expect(parse({ email: "no-at-sign" })).toEqual({ ok: false, field: "email" });
    expect(parse({ password: "short" })).toEqual({ ok: false, field: "password" });
    expect(parse({ terms: undefined })).toEqual({ ok: false, field: "terms" });
  });
  it("refuses emails that could break a database filter or the staff placeholder domain", () => {
    expect(parse({ email: "a,b@x.com" })).toEqual({ ok: false, field: "email" });
    expect(parse({ email: "a(b)@x.com" })).toEqual({ ok: false, field: "email" });
    expect(parse({ email: "9876543210@staff.clinicease.local" })).toEqual({ ok: false, field: "email" });
  });
  it("keeps 'other' specialty text and unknown channel becomes team", () => {
    const r = parse({ specialty: "other", specialty_other: "Sexologist", channel: "pigeon" });
    expect(r.ok && r.value.specialtyOther).toBe("Sexologist");
    expect(r.ok && r.value.channel).toBe("team");
  });
});

describe("pickChannel", () => {
  it("uses the chosen channel when on, else any on, else team", () => {
    expect(pickChannel("email", { email: true, mobile: true })).toBe("email");
    expect(pickChannel("mobile", { email: true, mobile: false })).toBe("email");
    expect(pickChannel("email", { email: false, mobile: true })).toBe("mobile");
    expect(pickChannel("mobile", { email: false, mobile: false })).toBe("team");
    expect(pickChannel("team", { email: true, mobile: true })).toBe("team");
  });
});

describe("small helpers", () => {
  it("masks targets", () => {
    expect(maskTarget("9876543210")).toBe("98•••••210");
    expect(maskTarget("doctor@gmail.com")).toBe("do•••@gmail.com");
  });
  it("makes a short ref", () => {
    expect(signupRef("1a2b3c4d-5e6f-0000-0000-000000000000")).toBe("1A2B3C4D");
  });
  it("labels specialties and has unique keys that fit the DB check", () => {
    expect(specialtyLabel("skin", "hi")).toContain("खुजली");
    expect(specialtyLabel("nope")).toBe("");
    const keys = SPECIALTIES.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k).toMatch(/^[a-z_]{2,30}$/);
  });
  it("messages never contain a password", () => {
    const t = teamVerifyText({ ref: "AB12CD34", doctorName: "Amit", clinicName: "Sharma Clinic", city: "Guna", phone: "9876543210" });
    expect(t).toContain("AB12CD34");
    const a = approvedText({ appUrl: "https://x.app", doctorName: "Amit", clinicName: "Sharma Clinic", phone: "9876543210", email: "a@b.in" });
    expect(a).toContain("https://x.app/login");
    expect(a.toLowerCase()).not.toContain("secret");
  });
});
