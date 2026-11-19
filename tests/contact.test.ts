import { describe, expect, it } from "vitest";
import { COMPANY, HUB, cleanPhone, getTeam } from "@/lib/contact";

describe("founder contact", () => {
  it("cleans Indian phone numbers", () => {
    expect(cleanPhone("+91 98765-43210")).toBe("9876543210");
    expect(cleanPhone("12345")).toBe("");
    expect(cleanPhone(undefined)).toBe("");
  });

  it("hides a founder with no phone and no email", () => {
    const team = getTeam([
      { role: "sales", name: "A", phone: "", email: "" },
      { role: "tech", name: "B", phone: "9876543210", email: "" },
    ]);
    expect(team).toHaveLength(1);
    expect(team[0].role).toBe("tech");
    expect(team[0].tel).toBe("tel:+919876543210");
    expect(team[0].whatsapp).toContain("https://wa.me/919876543210");
    expect(team[0].display).toBe("+91 98765 43210");
  });

  it("keeps email-only founders, without call links", () => {
    const [p] = getTeam([{ role: "sales", name: "A", phone: "", email: " a@b.in " }]);
    expect(p.email).toBe("a@b.in");
    expect(p.tel).toBe("");
  });

  it("shows only भारत, no city or address", () => {
    expect(HUB.hi).toBe("भारत");
    expect(HUB.en).toBe("भारत");
  });

  it("has both founders filled in", () => {
    const team = getTeam();
    expect(team.map((t) => [t.role, t.name, t.display, t.email])).toEqual([
      ["sales", "Abhishek Dhakad", "+91 93403 46510", "mahakall070@gmail.com"],
      ["tech", "Aniket Dhakad", "+91 62602 07359", "aniketdhakad181@gmail.com"],
    ]);
    expect(COMPANY.en).toBe("Teja Anna Group · Teja Anna Automation");
  });
});

describe("home page order", () => {
  it("login, then plans, then contact as the last section", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/app/page.tsx", "utf8");
    const login = src.lastIndexOf('href="/login"');
    const plans = src.indexOf("<PricingPlans");
    const contact = src.indexOf("<TeamContact");
    expect(login).toBeGreaterThan(0);
    expect(plans).toBeGreaterThan(login);
    expect(contact).toBeGreaterThan(plans);
    expect(src.indexOf("<section", contact)).toBe(-1);
  });
});
