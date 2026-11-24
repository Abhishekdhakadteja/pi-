import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
process.env.PATIENT_SESSION_SECRET = "test-secret-for-reset";

const { parseResetId, passwordProblem, passwordScore, resetLimited, RESET_LIMITS, isPlaceholderEmail, ownerResetText } = await import(
  "@/lib/password-reset"
);
const { hashResetCode, hashResetId, resetCodeMatches, tempPassword, newResetCode, findResetTarget } = await import("@/lib/password-reset-server");
const { sendCodeEmail } = await import("@/lib/signup-otp");

describe("parseResetId", () => {
  it("reads a mobile in any common form", () => {
    expect(parseResetId("+91 98765-43210")).toEqual({ kind: "phone", value: "9876543210" });
    expect(parseResetId("09876543210")).toEqual({ kind: "phone", value: "9876543210" });
  });
  it("reads an email in lower case", () => {
    expect(parseResetId("  Dr.Amit@Gmail.com ")).toEqual({ kind: "email", value: "dr.amit@gmail.com" });
  });
  it("treats the hidden staff email as the mobile it stands for", () => {
    expect(parseResetId("9876543210@staff.clinicease.local")).toEqual({ kind: "phone", value: "9876543210" });
  });
  it("rejects junk", () => {
    for (const bad of ["", "12345", "abc", "a@b", "5876543210", "x".repeat(130)]) expect(parseResetId(bad)).toBeNull();
  });
});

describe("password strength", () => {
  it("accepts a decent password", () => {
    expect(passwordProblem("Guna2026clinic")).toBeNull();
    expect(passwordProblem("meri dawa 42")).toBeNull();
  });
  it("names what is wrong", () => {
    expect(passwordProblem("ab12")).toBe("short");
    expect(passwordProblem("a1".repeat(40))).toBe("long");
    expect(passwordProblem("12345678")).toBe("common");
    expect(passwordProblem("Doctor@123")).toBe("common");
    expect(passwordProblem("onlyletters")).toBe("weak");
    expect(passwordProblem("98765432")).toBe("weak");
    expect(passwordProblem("aaaa1111")).toBe("weak");
  });
  it("refuses the person's own mobile or email name", () => {
    expect(passwordProblem("amit543210", { phone: "9876543210" })).toBe("personal");
    expect(passwordProblem("drsharma99", { email: "drsharma@gmail.com" })).toBe("personal");
    // the made-up staff email is not personal information
    expect(passwordProblem("blue7river", { email: "9876543210@staff.clinicease.local" })).toBeNull();
  });
  it("meter goes up with length and variety", () => {
    expect(passwordScore("")).toBe(0);
    expect(passwordScore("12345678")).toBe(1);
    expect(passwordScore("guna2026x")).toBe(2);
    expect(passwordScore("Guna-2026-Clinic!")).toBe(4);
  });
});

describe("reset limits", () => {
  const zero = { id10: 0, idDay: 0, ip10: 0, ipDay: 0 };
  it("allows a normal person, stops floods", () => {
    expect(resetLimited({ ...zero, id10: 1 })).toBe(false);
    expect(resetLimited({ ...zero, id10: RESET_LIMITS.idPer10Min })).toBe(true);
    expect(resetLimited({ ...zero, idDay: RESET_LIMITS.idPerDay })).toBe(true);
    expect(resetLimited({ ...zero, ip10: RESET_LIMITS.ipPer10Min })).toBe(true);
    expect(resetLimited({ ...zero, ipDay: RESET_LIMITS.ipPerDay })).toBe(true);
  });
});

describe("reset codes", () => {
  it("are 6 digits, hashed per login, and checked exactly", () => {
    const code = newResetCode();
    expect(code).toMatch(/^[1-9][0-9]{5}$/);
    const h = hashResetCode("user-1", code);
    expect(h).not.toContain(code);
    expect(resetCodeMatches("user-1", code, h)).toBe(true);
    expect(resetCodeMatches("user-2", code, h)).toBe(false); // a code for one login never opens another
    expect(resetCodeMatches("user-1", "000000", h)).toBe(false);
    expect(resetCodeMatches("user-1", code, null)).toBe(false); // rows for unknown logins have no code
  });
  it("hash the typed login so the database never stores it", () => {
    const a = hashResetId({ kind: "phone", value: "9876543210" });
    expect(a).not.toContain("9876543210");
    expect(a).toBe(hashResetId({ kind: "phone", value: "9876543210" }));
    expect(a).not.toBe(hashResetId({ kind: "email", value: "9876543210" }));
  });
});

describe("owner fallback", () => {
  it("temporary passwords pass the strength check and differ", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const p = tempPassword();
      expect(p).toHaveLength(10);
      expect(passwordProblem(p)).toBeNull();
      seen.add(p);
    }
    expect(seen.size).toBe(50);
  });
  it("WhatsApp text has the login and asks to change it", () => {
    const t = ownerResetText({ name: "Amit", loginId: "9876543210", password: "abcDEFg234", appUrl: "https://x.app" });
    expect(t).toContain("9876543210");
    expect(t).toContain("https://x.app/login");
    expect(t).toContain("पासवर्ड भूल गए?");
  });
  it("knows the placeholder email", () => {
    expect(isPlaceholderEmail("98@staff.clinicease.local")).toBe(true);
    expect(isPlaceholderEmail("a@gmail.com")).toBe(false);
  });
});

// Tiny stand-in for the Supabase query builder: every filter is recorded, the table decides the rows.
function fakeDb(tables: Record<string, Record<string, unknown>[]>) {
  return {
    from(table: string) {
      const filters: [string, unknown][] = [];
      const q = {
        select: () => q,
        limit: () => q,
        order: () => q,
        eq: (c: string, v: unknown) => (filters.push([c, v]), q),
        rows: () => (tables[table] ?? []).filter((r) => filters.every(([c, v]) => r[c] === v)),
        maybeSingle: async () => ({ data: q.rows()[0] ?? null, error: null }),
        then: (res: (v: { data: unknown[]; error: null }) => unknown) => res({ data: q.rows(), error: null }),
      };
      return q;
    },
  } as never;
}

describe("findResetTarget", () => {
  const db = fakeDb({
    users: [
      { id: "doc", clinic_id: "c1", role: "doctor", email: "9876543210@staff.clinicease.local", phone: "9876543210", active: true },
      { id: "adm", clinic_id: "c1", role: "admin", email: "amit@gmail.com", phone: null, active: true },
      { id: "old", clinic_id: "c1", role: "attender", email: "9000000001@staff.clinicease.local", phone: "9000000001", active: false },
      { id: "new", clinic_id: "c2", role: "doctor", email: "9000000002@staff.clinicease.local", phone: "9000000002", active: true },
    ],
    clinics: [
      { id: "c1", signup_status: "active" },
      { id: "c2", signup_status: "pending" },
    ],
  });
  it("sends a mobile login's code to the clinic admin email", async () => {
    expect(await findResetTarget(db, { kind: "phone", value: "9876543210" })).toMatchObject({ userId: "doc", email: "amit@gmail.com" });
  });
  it("sends an email login's code to that email", async () => {
    expect(await findResetTarget(db, { kind: "email", value: "amit@gmail.com" })).toMatchObject({ userId: "adm", email: "amit@gmail.com" });
  });
  it("finds nobody for unknown, removed or unverified logins", async () => {
    expect(await findResetTarget(db, { kind: "phone", value: "9111111111" })).toBeNull();
    expect(await findResetTarget(db, { kind: "phone", value: "9000000001" })).toBeNull();
    expect(await findResetTarget(db, { kind: "phone", value: "9000000002" })).toBeNull();
  });
});

describe("reset email", () => {
  afterEach(() => {
    delete process.env.SIGNUP_EMAIL_FROM;
    delete process.env.BREVO_API_KEY;
  });
  it("is not sent when email is not set up", async () => {
    const f = vi.fn();
    expect(await sendCodeEmail("a@gmail.com", "123456", "reset", f as never)).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
  it("goes through Brevo with reset wording", async () => {
    process.env.SIGNUP_EMAIL_FROM = "no-reply@clinic.test";
    process.env.BREVO_API_KEY = "k";
    const f = vi.fn(async () => new Response("{}", { status: 201 }));
    expect(await sendCodeEmail("a@gmail.com", "654321", "reset", f as never)).toBe(true);
    const body = JSON.parse((f.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body.subject).toContain("password reset");
    expect(body.textContent).toContain("654321");
    expect(body.textContent).toContain("अनदेखा");
    expect(body.to).toEqual([{ email: "a@gmail.com" }]);
  });
});
