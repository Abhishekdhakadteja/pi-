import { describe, expect, it } from "vitest";
import { cleanName, isValidDate, normalizePhone, parseAge, parseDays } from "@/lib/validate";
import { addDays, courseDates, formatTime, monthEnd, periodRange, todayIST, weekStart } from "@/lib/dates";
import { last4Matches, queueView } from "@/lib/queue";
import { fillTemplate, isStopMessage, isValidTemplate } from "@/lib/reminder-text";

describe("phone validation (India, 10 digits)", () => {
  it.each([
    ["9876543210", "9876543210"],
    ["+91 98765 43210", "9876543210"],
    ["919876543210", "9876543210"],
    ["09876543210", "9876543210"],
    ["98765-43210", "9876543210"],
  ])("accepts %s", (input, out) => expect(normalizePhone(input)).toBe(out));
  it.each(["12345", "5876543210", "98765432101", "", "abcdefghij", "0000000000"])("rejects %s", (input) =>
    expect(normalizePhone(input)).toBeNull(),
  );
});

describe("date validation", () => {
  it("accepts real dates", () => expect(isValidDate("2026-02-28")).toBe(true));
  it("rejects impossible dates", () => {
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("11/11/2026")).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
  });
});

describe("other inputs", () => {
  it("names", () => {
    expect(cleanName("  Ram   Lal ")).toBe("Ram Lal");
    expect(cleanName("   ")).toBeNull();
  });
  it("age", () => {
    expect(parseAge("")).toBeNull();
    expect(parseAge("45")).toBe(45);
    expect(parseAge("150")).toBe("invalid");
    expect(parseAge("4.5")).toBe("invalid");
  });
  it("days", () => {
    expect(parseDays("15")).toBe(15);
    expect(parseDays("0")).toBeNull();
    expect(parseDays("400")).toBeNull();
  });
});

describe("India dates", () => {
  it("today in IST rolls over at 18:30 UTC", () => {
    expect(todayIST(new Date("2026-11-11T18:29:00Z"))).toBe("2026-11-11");
    expect(todayIST(new Date("2026-11-11T18:31:00Z"))).toBe("2026-11-12");
  });
  it("course of 15 days starting 11 Nov ends 25 Nov; next visit same day", () => {
    expect(courseDates("2026-11-11", 15)).toEqual({ end_date: "2026-11-25", next_visit_date: "2026-11-25" });
  });
  it("week and month ranges", () => {
    expect(weekStart("2026-11-11")).toBe("2026-11-09"); // Monday
    expect(monthEnd("2026-02-10")).toBe("2026-02-28");
    expect(periodRange("week", "2026-11-11")).toEqual({ from: "2026-11-09", to: "2026-11-15" });
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("12-hour time", () => {
    expect(formatTime("09:05:00")).toBe("9:05 AM");
    expect(formatTime("12:00:00")).toBe("12:00 PM");
    expect(formatTime("17:30:00")).toBe("5:30 PM");
  });
});

describe("live queue view", () => {
  const q = { now_running: 5, pending_tokens: [6, 7, 8, 9], done_tokens: [1, 2, 3, 4] };
  it("patients ahead", () => expect(queueView(q, 9)).toEqual({ ahead: 3, state: "wait", home: false }));
  it("2 numbers away -> be ready", () => expect(queueView(q, 7).state).toBe("soon"));
  it("my turn -> go in", () => expect(queueView(q, 5).state).toBe("go_in"));
  it("done", () => expect(queueView(q, 2).state).toBe("done"));
});

describe("booked from home: called first", () => {
  const q = { now_running: 5, pending_tokens: [6, 7, 8, 9, 12], done_tokens: [1, 2, 3, 4], home_tokens: [8, 12] };
  it("only other home bookings count as ahead", () => expect(queueView(q, 12)).toEqual({ ahead: 1, state: "soon", home: true }));
  it("first home booking has nobody ahead", () => expect(queueView(q, 8).ahead).toBe(0));
  it("walk-in still counts everyone before", () => expect(queueView(q, 9)).toEqual({ ahead: 3, state: "wait", home: false }));
  it("old rows without home_tokens work", () =>
    expect(queueView({ now_running: 5, pending_tokens: [6, 7, 8, 9], done_tokens: [], home_tokens: null }, 9).ahead).toBe(3));
});

describe("reminder link: last 4 digits", () => {
  it("matches", () => expect(last4Matches("9876543210", "3210")).toBe(true));
  it("ignores spaces", () => expect(last4Matches("9876543210", " 32 10 ")).toBe(true));
  it("wrong digits", () => expect(last4Matches("9876543210", "3211")).toBe(false));
  it("needs exactly 4 digits", () => {
    expect(last4Matches("9876543210", "210")).toBe(false);
    expect(last4Matches("9876543210", "9876543210")).toBe(false);
    expect(last4Matches("9876543210", "")).toBe(false);
  });
});

describe("reminder message", () => {
  const tpl =
    "Hello {patient}, a message from Dr. {doctor} at {clinic}: your course is about to end. So your treatment is not interrupted, please book your visit here: {link}. Reply STOP to stop messages.";
  it("fills only the 4 placeholders", () => {
    const m = fillTemplate(tpl, { patient: "Ram {x}", doctor: "Sharma", clinic: "Demo Clinic", link: "https://x.in/book/demo?r=abc" });
    expect(m).toContain("Hello Ram x,");
    expect(m).toContain("Dr. Sharma at Demo Clinic");
    expect(m).toContain("https://x.in/book/demo?r=abc");
    expect(m).not.toMatch(/\{|\}/);
  });
  it("template must keep {link} and only known placeholders", () => {
    expect(isValidTemplate(tpl)).toBe(true);
    expect(isValidTemplate("Hello {patient}")).toBe(false);
    expect(isValidTemplate("Hello {patient} {diagnosis} {link}")).toBe(false);
  });
  it("STOP replies", () => {
    expect(isStopMessage("stop")).toBe(true);
    expect(isStopMessage(" STOP please")).toBe(true);
    expect(isStopMessage("बंद")).toBe(true);
    expect(isStopMessage("thanks")).toBe(false);
  });
});
