import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ supabaseAdmin: () => { throw new Error("no db in tests"); } }));
const { scrubError, scrubPath, logError } = await import("@/lib/error-log");

describe("error log", () => {
  it("masks phone numbers, emails and ids", () => {
    const s = scrubError("Patient 98765 43210 / +919876543210 a.b@gmail.com 3f2a1b4c-1111-2222-3333-444455556666 failed");
    expect(s).not.toMatch(/9876/);
    expect(s).not.toContain("gmail");
    expect(s).toContain("[number]");
    expect(s).toContain("[email]");
    expect(s).toContain("[id]");
  });
  it("keeps short numbers like status codes and cuts long text", () => {
    expect(scrubError("HTTP 500 at step 3")).toBe("HTTP 500 at step 3");
    expect(scrubError("x".repeat(1000)).length).toBe(300);
  });
  it("drops the query string from paths", () => {
    expect(scrubPath("/book/sharma-clinic?r=abc123#x")).toBe("/book/sharma-clinic");
  });
  it("never throws even when the database is down", async () => {
    await expect(logError({ source: "server", message: "boom" })).resolves.toBeUndefined();
  });
});
