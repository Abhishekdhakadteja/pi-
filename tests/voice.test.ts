import { describe, expect, it } from "vitest";
import { appendSpoken } from "@/components/os/VoiceButton";

describe("voice notes", () => {
  it("fills an empty field", () => expect(appendSpoken("", " बुखार तीन दिन से ")).toBe("बुखार तीन दिन से"));
  it("adds a space between phrases", () => expect(appendSpoken("बुखार", "खांसी")).toBe("बुखार खांसी"));
  it("keeps a new line", () => expect(appendSpoken("BP 130/80\n", "sugar normal")).toBe("BP 130/80\nsugar normal"));
  it("ignores silence", () => expect(appendSpoken("x", "  ")).toBe("x"));
});
