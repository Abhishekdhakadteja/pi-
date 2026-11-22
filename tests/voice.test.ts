import { describe, expect, it } from "vitest";
import { appendSpoken } from "@/components/os/VoiceButton";

describe("voice notes", () => {
  it("fills an empty field", () => expect(appendSpoken("", " बुखार तीन दिन से ")).toBe("बुखार तीन दिन से"));
  it("adds a space between phrases", () => expect(appendSpoken("बुखार", "खांसी")).toBe("बुखार खांसी"));
  it("keeps a new line", () => expect(appendSpoken("BP 130/80\n", "sugar normal")).toBe("BP 130/80\nsugar normal"));
  it("ignores silence", () => expect(appendSpoken("x", "  ")).toBe("x"));
});

import { spokenDigits } from "@/components/os/VoiceButton";
describe("voice numbers", () => {
  it("reads digits, Devanagari digits and number words", () => {
    expect(spokenDigits("98765 43210")).toBe("9876543210");
    expect(spokenDigits("९८७६५ ४३२१०")).toBe("9876543210");
    expect(spokenDigits("नौ आठ seven 6")).toBe("9876");
    expect(spokenDigits("उम्र 45 साल")).toBe("45");
  });
});
