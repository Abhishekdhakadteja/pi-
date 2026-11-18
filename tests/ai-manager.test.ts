import { describe, expect, it } from "vitest";
import {
  cleanSearch,
  daysBetween,
  maskPhone,
  MAX_RANGE_DAYS,
  TOOL_INPUT,
  TOOL_ROLES,
  TOOL_SCHEMAS,
  toolsForRole,
} from "@/lib/ai-manager/tools-def";
import { SUGGESTIONS } from "@/lib/ai-manager/words";

describe("AI मैनेजर tools: who gets what", () => {
  it("attender never gets medical history, money or staff tools", () => {
    const t = toolsForRole("attender");
    expect(t).toEqual(["clinic_today", "list_appointments", "find_patients"]);
  });
  it("only the doctor can read patient history", () => {
    expect(toolsForRole("doctor")).toContain("patient_history");
    expect(toolsForRole("admin")).not.toContain("patient_history");
  });
  it("only the admin gets the staff list", () => {
    expect(toolsForRole("admin")).toContain("staff_list");
    expect(toolsForRole("doctor")).not.toContain("staff_list");
  });
  it("every tool has a schema and an input validator", () => {
    for (const name of Object.keys(TOOL_ROLES)) {
      expect(TOOL_SCHEMAS).toHaveProperty(name);
      expect(TOOL_INPUT).toHaveProperty(name);
    }
  });
});

describe("AI मैनेजर tool inputs", () => {
  it("accepts a valid date and rejects junk", () => {
    expect(TOOL_INPUT.list_appointments.safeParse({ date: "2026-11-18" }).success).toBe(true);
    expect(TOOL_INPUT.list_appointments.safeParse({ date: "kal" }).success).toBe(false);
    expect(TOOL_INPUT.list_appointments.safeParse({ date: "2026-11-18", status: "deleted" }).success).toBe(false);
  });
  it("rejects unknown fields", () => {
    expect(TOOL_INPUT.clinic_today.safeParse({ sql: "drop table" }).success).toBe(false);
  });
  it("limits money ranges", () => {
    expect(TOOL_INPUT.money_summary.safeParse({ from: "2026-11-01", to: "2026-11-30" }).success).toBe(true);
    expect(TOOL_INPUT.money_summary.safeParse({ from: "2026-11-30", to: "2026-11-01" }).success).toBe(false);
    expect(TOOL_INPUT.money_summary.safeParse({ from: "2025-01-01", to: "2026-11-30" }).success).toBe(false);
    expect(daysBetween("2026-01-01", "2026-04-05")).toBeGreaterThan(MAX_RANGE_DAYS);
  });
  it("needs a real patient id", () => {
    expect(TOOL_INPUT.patient_history.safeParse({ patient_id: "ramesh" }).success).toBe(false);
    expect(TOOL_INPUT.patient_history.safeParse({ patient_id: "3f1c2b9e-8a7d-4c6b-9e5f-1a2b3c4d5e6f" }).success).toBe(true);
  });
});

describe("AI मैनेजर privacy helpers", () => {
  it("masks mobile numbers to the last 4 digits", () => {
    expect(maskPhone("9876543210")).toBe("••••••3210");
    expect(maskPhone(null)).toBeNull();
    expect(maskPhone("12")).toBeNull();
  });
  it("strips filter syntax from search text", () => {
    expect(cleanSearch("ram%,name.eq.x)")).toBe("ram name eq x");
    expect(cleanSearch("  सीता   देवी ")).toBe("सीता देवी");
  });
});

describe("AI मैनेजर suggestions", () => {
  it("has starter questions for every role in both languages", () => {
    for (const lang of ["hi", "en"] as const)
      for (const role of ["attender", "doctor", "admin"] as const) expect(SUGGESTIONS[lang][role].length).toBeGreaterThan(0);
  });
});
