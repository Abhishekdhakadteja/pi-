import { describe, expect, it } from "vitest";
import { toggleChip, COMPLAINT_CHIPS } from "@/components/ComplaintInput";
import { getDict, LANGS } from "@/lib/i18n";

describe("complaint chips", () => {
  it("adds a chip to empty text", () => {
    expect(toggleChip("", "बुखार")).toBe("बुखार");
  });
  it("adds a second chip with a comma", () => {
    expect(toggleChip("बुखार", "खांसी-जुकाम")).toBe("बुखार, खांसी-जुकाम");
  });
  it("removes a chip that is already there and keeps free text", () => {
    expect(toggleChip("बुखार, 3 दिन से, खांसी-जुकाम", "बुखार")).toBe("3 दिन से, खांसी-जुकाम");
  });
  it("never goes over 300 characters", () => {
    expect(toggleChip("x".repeat(299), "बुखार").length).toBeLessThanOrEqual(300);
  });
  it("has every chip word in both languages", () => {
    for (const l of LANGS) for (const k of COMPLAINT_CHIPS) expect(getDict(l)[k]).toBeTruthy();
  });
});

describe("new words", () => {
  it("has the edit, password-eye and complaint words in both languages", () => {
    for (const l of LANGS) {
      const d = getDict(l);
      for (const k of ["complaint", "complaintHint", "editDetails", "showPassword", "hidePassword", "fixFee", "todayComplaint", "loginSubtitle"] as const)
        expect(d[k]).toBeTruthy();
    }
  });
});
