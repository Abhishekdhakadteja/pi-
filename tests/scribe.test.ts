import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { followUpNote, normalizeScribe, saidInDictation, squash } from "@/lib/scribe-parse";
import { parseRxLines } from "@/lib/rx";
import { getIntegration } from "@/lib/integrations";

const DICT = "बुखार 3 दिन से, गला लाल है। पैरासिटामोल 650 दिन में तीन बार खाने के बाद 5 दिन। Azithromycin 500 रात को 3 दिन। 7 दिन बाद दिखाना।";

const raw = {
  notes: "बुखार 3 दिन से, गला लाल।",
  diagnosis: "Pharyngitis",
  medicines: [
    { spoken: "पैरासिटामोल 650", medicine: "Paracetamol 650", dose: "1-1-1", timing: "after_food", days: 5, note: "" },
    { spoken: "Azithromycin 500", medicine: "Azithromycin 500", dose: "0-0-1", timing: "any", days: 3, note: "" },
    { spoken: "Cetirizine", medicine: "Cetirizine 10", dose: "0-0-1", timing: "any", days: 5, note: "" },
  ],
  follow_up_days: 7,
};

describe("AI Scribe guardrails", () => {
  it("keeps only medicines the doctor actually said", () => {
    const d = normalizeScribe(raw, DICT)!;
    expect(d.lines.map((l) => l.medicine)).toEqual(["Paracetamol 650", "Azithromycin 500"]);
    expect(d.dropped).toEqual(["Cetirizine 10"]);
    expect(d.followUpDays).toBe(7);
    expect(d.diagnosis).toBe("Pharyngitis");
  });

  it("a made-up quote or a too-short quote never passes", () => {
    expect(saidInDictation("Amoxicillin", DICT)).toBe(false);
    expect(saidInDictation("50", DICT)).toBe(false);
    expect(saidInDictation("", DICT)).toBe(false);
    expect(saidInDictation("azithromycin   500", DICT)).toBe(true);
  });

  it("matching ignores case and punctuation", () => {
    expect(squash("Azithromycin-500, रात!")).toBe("azithromycin 500 रात");
  });

  it("bad values are cleaned: unknown timing -> any, days out of range -> empty", () => {
    const d = normalizeScribe(
      { notes: "", diagnosis: "", medicines: [{ spoken: "Azithromycin 500", medicine: "Azithromycin 500", dose: "1-0-1", timing: "with_milk", days: 0, note: "" }], follow_up_days: 0 },
      DICT,
    )!;
    expect(d.lines).toEqual([{ medicine: "Azithromycin 500", dose: "1-0-1", timing: "any", days: "", note: "" }]);
    expect(d.followUpDays).toBeNull();
  });

  it("garbage or empty output gives null", () => {
    expect(normalizeScribe(null, DICT)).toBeNull();
    expect(normalizeScribe("text", DICT)).toBeNull();
    expect(normalizeScribe({ notes: "", diagnosis: "", medicines: [], follow_up_days: 0 }, DICT)).toBeNull();
  });

  it("a filled draft passes the normal prescription check unchanged", () => {
    const d = normalizeScribe(raw, DICT)!;
    expect(parseRxLines(d.lines)).toHaveLength(2);
  });

  it("follow-up line in both languages", () => {
    expect(followUpNote(7, "hi")).toBe("7 दिन बाद दोबारा दिखाएँ।");
    expect(followUpNote(7, "en")).toBe("Follow-up after 7 days.");
  });

  it("the scribe is gated, limited and never saves by itself", () => {
    const s = readFileSync("src/app/doctor/actions.ts", "utf8");
    const fn = s.slice(s.indexOf("export async function aiScribe"));
    expect(fn.indexOf("requireProAI(")).toBeGreaterThan(0);
    expect(fn.indexOf("requireProAI(")).toBeLessThan(fn.indexOf("draftPrescription("));
    expect(fn).toContain("SCRIBE_DAILY_LIMIT");
    expect(fn).not.toMatch(/\.(insert|upsert|update|delete)\(/);
    const lib = readFileSync("src/lib/scribe.ts", "utf8");
    expect(lib).toContain("Never add a medicine");
    expect(lib).not.toMatch(/patients|phone|address/);
  });

  it("the services hub shows AI Scribe as a key service, not 'soon'", () => {
    expect(getIntegration("voice_rx").kind).toBe("key");
  });
});
