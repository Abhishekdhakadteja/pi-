import { describe, expect, it } from "vitest";
import { getLegal, GRIEVANCE_TITLE, LEGAL_UPDATED } from "@/lib/legal-content";
import { getTeam } from "@/lib/contact";

describe("privacy and terms pages", () => {
  for (const kind of ["privacy", "terms"] as const) {
    it(`${kind}: Hindi and English say the same number of things`, () => {
      const hi = getLegal(kind, "hi");
      const en = getLegal(kind, "en");
      expect(hi.sections.length).toBe(en.sections.length);
      hi.sections.forEach((s, i) => {
        expect(s.items?.length ?? 0).toBe(en.sections[i].items?.length ?? 0);
        expect(!!s.p).toBe(!!en.sections[i].p);
      });
    });
  }

  it("names the DPDP roles and the patient's rights", () => {
    const en = JSON.stringify(getLegal("privacy", "en"));
    expect(en).toContain("Data Fiduciary");
    expect(en).toContain("Data Processor");
    expect(en).toContain("Data Protection Board");
    expect(en).toMatch(/never the name or phone/);
  });

  it("has a grievance contact and a valid date", () => {
    expect(GRIEVANCE_TITLE.en).toBe("Grievance Officer");
    expect(getTeam().some((m) => m.role === "tech" && m.email)).toBe(true);
    expect(Number.isNaN(new Date(LEGAL_UPDATED).getTime())).toBe(false);
  });
});
