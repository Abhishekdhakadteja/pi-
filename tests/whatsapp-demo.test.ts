import { describe, expect, it } from "vitest";
import { cleanRef, demoCookieExp, isDemoEmail, DEMO_SECONDS } from "@/lib/demo";
import { buyText, demoInviteText, waLink, welcomeText, WHATSAPP_NUMBER } from "@/lib/whatsapp";

describe("5-minute demo helpers", () => {
  it("knows demo emails only by the demo domain", () => {
    expect(isDemoEmail("doctor@live-demo.cliniceasy.app")).toBe(true);
    expect(isDemoEmail("DESK@LIVE-DEMO.CLINICEASY.APP")).toBe(true);
    expect(isDemoEmail("doctor@demo.clinic")).toBe(false);
    expect(isDemoEmail("x@live-demo.cliniceasy.app.evil.com")).toBe(false);
    expect(isDemoEmail(null)).toBe(false);
  });
  it("reads the end time from a signed-cookie body", () => {
    const exp = Math.floor(Date.now() / 1000) + DEMO_SECONDS;
    const body = Buffer.from(JSON.stringify({ uid: "u1", exp })).toString("base64url");
    expect(demoCookieExp(`${body}.sig`)).toBe(exp);
    expect(demoCookieExp("garbage")).toBeNull();
    expect(demoCookieExp(undefined)).toBeNull();
  });
  it("is exactly five minutes", () => expect(DEMO_SECONDS).toBe(300));
  it("cleans tracking refs", () => {
    expect(cleanRef("WA-Greeting!")).toBe("wa-greeting");
    expect(cleanRef("")).toBeNull();
    expect(cleanRef("x".repeat(99))?.length).toBe(40);
  });
});

describe("WhatsApp links and messages", () => {
  it("opens a chat with Clinic Easy's number and the text filled in", () => {
    const l = waLink("Hello DEMO");
    expect(l.startsWith(`https://wa.me/91${WHATSAPP_NUMBER}?text=`)).toBe(true);
    expect(decodeURIComponent(l.split("text=")[1])).toBe("Hello DEMO");
    expect(waLink("hi", "")).toBe("https://wa.me/?text=hi");
  });
  it("buy message names plan, clinic and reference", () => {
    const t = buyText({ plan: "pro", cycle: "first_month", clinicName: "Hasan clinic", clinicSlug: "hasan-clinic-9355de", doctorName: "Dr Hasan" });
    expect(t).toContain("AI Pro");
    expect(t).toContain("Hasan clinic");
    expect(t).toContain("Ref: hasan-clinic-9355de");
    expect(buyText({ plan: "basic", cycle: "month" }, "en")).toContain("Clinic Easy Basic (monthly)");
  });
  it("demo invite and welcome carry the right links", () => {
    expect(demoInviteText("https://x.app/", "Dr. Rao")).toContain("https://x.app/demo?ref=wa");
    expect(demoInviteText("https://x.app", "Dr. Rao")).toContain("Dr. Rao");
    const w = welcomeText({ appUrl: "https://x.app", plan: "pro_max", doctorName: "Mehta", until: "2027-01-31T00:00:00Z" });
    expect(w).toContain("Pro Max");
    expect(w).toContain("https://x.app/login");
    expect(w).toContain("https://x.app/demo?ref=welcome");
    expect(w).toContain("2027-01-31");
  });
});
