import { describe, expect, it, vi } from "vitest";
import {
  adherence,
  addDaysYmd,
  daysLeft,
  emptyData,
  medAlert,
  parseData,
  sosMessage,
  stockLeft,
  takenKey,
  validVital,
  vitalLevel,
  withStock,
  type Med,
} from "@/lib/health/pro-data";
import { PATIENT_FEATURES, PATIENT_PRO, patientProMargin } from "@/lib/health/pro-plan";

vi.mock("server-only", () => ({}));

const today = "2026-11-20";
const med = (p: Partial<Med> = {}): Med => ({
  id: "m1",
  profileId: "p1",
  name: "Metformin",
  dose: "1 after food",
  times: ["08:00", "20:00"],
  perDose: 1,
  stock: 10,
  stockDate: today,
  endDate: "",
  ...p,
});

describe("medicine tracker", () => {
  it("counts tablets left from doses marked taken", () => {
    const taken = { [takenKey("m1", today, "08:00")]: true, [takenKey("m1", today, "20:00")]: true };
    expect(stockLeft(med(), taken)).toBe(8);
    expect(daysLeft(med(), taken)).toBe(4);
  });

  it("does not subtract doses taken before the count was entered", () => {
    const taken = { [takenKey("m1", today, "08:00")]: true };
    const m = withStock(med(), 30, taken, today); // counted after the morning dose
    expect(stockLeft(m, taken)).toBe(30);
    expect(stockLeft(m, { ...taken, [takenKey("m1", today, "20:00")]: true })).toBe(29);
  });

  it("alerts to refill 3 days before running out, and when out", () => {
    expect(medAlert(med({ stock: 6 }), {}, today)).toBe("refill");
    expect(medAlert(med({ stock: 0 }), {}, today)).toBe("out");
    expect(medAlert(med({ stock: 60 }), {}, today)).toBeNull();
  });

  it("no refill alert when the course ends before the tablets do", () => {
    expect(medAlert(med({ stock: 4, endDate: addDaysYmd(today, 1) }), {}, today)).toBe("course_ending");
  });

  it("adherence over the last days", () => {
    const m = med({ stockDate: addDaysYmd(today, -1) });
    const taken = { [takenKey("m1", today, "08:00")]: true, [takenKey("m1", addDaysYmd(today, -1), "08:00")]: true };
    expect(adherence([m], taken, today, 7)).toBe(50);
    expect(adherence([], {}, today)).toBeNull();
  });
});

describe("health readings", () => {
  it.each([
    ["bp", 118, 76, "ok"],
    ["bp", 135, 85, "watch"],
    ["bp", 150, 95, "doctor"],
    ["bp", 190, 110, "urgent"],
    ["sugar_fasting", 90, 0, "ok"],
    ["sugar_fasting", 130, 0, "doctor"],
    ["sugar_fasting", 50, 0, "urgent"],
    ["sugar_random", 450, 0, "urgent"],
    ["spo2", 97, 0, "ok"],
    ["spo2", 93, 0, "doctor"],
    ["spo2", 88, 0, "urgent"],
    ["temp", 98.6, 0, "ok"],
    ["temp", 101, 0, "watch"],
    ["temp", 104.5, 0, "urgent"],
    ["pulse", 72, 0, "ok"],
    ["pulse", 150, 0, "urgent"],
  ] as const)("%s %s/%s → %s", (type, a, b, lvl) => {
    expect(vitalLevel(type, a, b)).toBe(lvl);
  });

  it("rejects impossible readings", () => {
    expect(validVital("bp", 120, 80)).toBe(true);
    expect(validVital("bp", 80, 120)).toBe(false);
    expect(validVital("bp", 120)).toBe(false);
    expect(validVital("spo2", 120)).toBe(false);
    expect(validVital("weight", Number.NaN)).toBe(false);
  });
});

describe("backup and SOS", () => {
  it("round-trips a backup and rejects foreign files", () => {
    const d = emptyData("Asha");
    expect(parseData(JSON.parse(JSON.stringify(d)))?.profiles[0].name).toBe("Asha");
    expect(parseData({ foo: 1 })).toBeNull();
    expect(parseData(null)).toBeNull();
  });

  it("SOS message carries a maps link when location is known", () => {
    expect(sosMessage("Asha", 24.64, 77.31, "hi")).toContain("https://maps.google.com/?q=24.64000,77.31000");
    expect(sosMessage("Asha", null, null, "en")).not.toContain("maps");
  });
});

describe("patient plan", () => {
  it("₹499/month with a healthy margin", () => {
    expect(PATIENT_PRO.month).toBe(499);
    expect(patientProMargin().percent).toBeGreaterThan(90);
  });
  it("Basic tools are free, Pro adds more, AI is marked soon", () => {
    expect(PATIENT_FEATURES.filter((f) => f.basic).every((f) => f.pro)).toBe(true);
    expect(PATIENT_FEATURES.filter((f) => f.pro && !f.basic).length).toBeGreaterThanOrEqual(7);
    expect(PATIENT_FEATURES.find((f) => f.en.startsWith("AI"))?.soon).toBe(true);
  });
});

describe("activation codes", () => {
  it("are signed, expire and cannot be forged", async () => {
    process.env.PATIENT_SESSION_SECRET = "x".repeat(40);
    const { makeActivationCode, readActivationCode } = await import("@/lib/health/patient-pro");
    const code = makeActivationCode("9826012345", 1);
    const t = readActivationCode(code);
    expect(t?.kind).toBe("pro");
    expect(t?.p).toBe("2345");
    const [body, sig] = code.split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), exp: 9999999999 })).toString("base64url");
    expect(readActivationCode(`${forged}.${sig}`)).toBeNull();
    expect(readActivationCode("garbage")).toBeNull();
  });
});
