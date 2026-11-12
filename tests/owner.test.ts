import { describe, expect, it } from "vitest";
import { isOwnerEmail, makeSlug, parseOwnerEmails, welcomeMessage } from "@/lib/owner-utils";

describe("owner emails", () => {
  it("parses comma/space separated list, lower-cases, drops junk", () => {
    expect(parseOwnerEmails(" A@x.com, b@Y.in  nope ,, ")).toEqual(["a@x.com", "b@y.in"]);
    expect(parseOwnerEmails(undefined)).toEqual([]);
    expect(parseOwnerEmails("")).toEqual([]);
  });
  it("matches case-insensitively and rejects empty", () => {
    const owners = parseOwnerEmails("boss@clinic.in");
    expect(isOwnerEmail("Boss@Clinic.in", owners)).toBe(true);
    expect(isOwnerEmail("other@clinic.in", owners)).toBe(false);
    expect(isOwnerEmail(null, owners)).toBe(false);
    expect(isOwnerEmail("boss@clinic.in", [])).toBe(false);
  });
});

describe("makeSlug", () => {
  const ok = (s: string) => /^[a-z0-9-]{3,40}$/.test(s);
  it("builds a valid clinics.slug", () => {
    const s = makeSlug("Dr. Sharma's Clinic, Indore", "a1b2c3");
    expect(s).toBe("dr-sharmas-clinic-indore-a1b2c3");
    expect(ok(s)).toBe(true);
  });
  it("handles Hindi-only and very long names", () => {
    expect(makeSlug("शर्मा क्लिनिक", "ff00aa")).toBe("clinic-ff00aa");
    const long = makeSlug("A".repeat(200), "123456");
    expect(ok(long)).toBe(true);
    expect(long.length).toBeLessThanOrEqual(40);
  });
});

describe("welcomeMessage", () => {
  it("contains login link and ids but never a password", () => {
    const m = welcomeMessage({
      appUrl: "https://x.app",
      clinicName: "Sharma Clinic",
      doctorName: "Sharma",
      doctorPhone: "9876543210",
      adminEmail: "dr@x.in",
      attenderPhone: "9123456789",
    });
    expect(m).toContain("https://x.app/login");
    expect(m).toContain("9876543210");
    expect(m).toContain("dr@x.in");
    expect(m).toContain("9123456789");
    expect(m.toLowerCase()).not.toMatch(/password:/);
  });
});
