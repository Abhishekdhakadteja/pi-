import { describe, expect, it } from "vitest";
import { isValidUpiId, rxMessage, upiLink, waLink } from "@/lib/share";
import { parseAmount, rupees, summarize } from "@/lib/money";
import { parseRxLines } from "@/lib/rx";
import { moneyRange } from "@/lib/dates";

describe("free WhatsApp link", () => {
  it("opens chat with the patient's number and the text filled in", () => {
    expect(waLink("9876543210", "Namaste & hello")).toBe("https://wa.me/919876543210?text=Namaste%20%26%20hello");
  });
  it("bad number opens WhatsApp without a recipient instead of a wrong one", () => {
    expect(waLink("123", "x")).toBe("https://wa.me/?text=x");
  });
});

describe("UPI (clinic's own account, no gateway)", () => {
  it.each(["drsharma@okaxis", "9876543210@ybl", "clinic.name-1@paytm"])("valid UPI ID %s", (v) => expect(isValidUpiId(v)).toBe(true));
  it.each(["", "drsharma", "@okaxis", "a b@ok", "x@y"])("invalid UPI ID %s", (v) => expect(isValidUpiId(v)).toBe(false));
  it("builds an NPCI upi:// link with amount", () => {
    const l = upiLink({ upiId: "dr@okaxis", payee: "Demo Clinic", amount: 300, note: "Clinic fee" });
    expect(l).toBe("upi://pay?pa=dr%40okaxis&pn=Demo%20Clinic&cu=INR&am=300.00&tn=Clinic%20fee");
  });
  it("leaves the amount out when zero, so the patient types it", () => {
    expect(upiLink({ upiId: "dr@okaxis", payee: "C", amount: 0 })).not.toContain("am=");
  });
});

describe("balance sheet", () => {
  const pays = [
    { amount: 300, discount: 0, mode: "cash", kind: "consultation", paid_on: "2026-11-10" },
    { amount: 500, discount: 100, mode: "upi", kind: "procedure", paid_on: "2026-11-11" },
    { amount: 200, discount: 0, mode: "upi", kind: "consultation", paid_on: "2026-11-11" },
  ];
  const exps = [{ amount: 400, category: "electricity", spent_on: "2026-11-11" }];
  it("adds income, expenses and profit", () => {
    const s = summarize(pays, exps);
    expect(s.income).toBe(1000);
    expect(s.expenses).toBe(400);
    expect(s.net).toBe(600);
    expect(s.discount).toBe(100);
    expect(s.byMode).toEqual({ cash: 300, upi: 700 });
    expect(s.byCategory).toEqual({ electricity: 400 });
    expect(s.byDay).toEqual([
      { day: "2026-11-11", income: 700, expenses: 400 },
      { day: "2026-11-10", income: 300, expenses: 0 },
    ]);
  });
  it("loss shows as negative profit", () => expect(summarize([], exps).net).toBe(-400));
  it("formats rupees in Indian style", () => expect(rupees(1250000)).toBe("₹12,50,000"));
  it.each([
    ["300", 300],
    ["₹1,500", 1500],
    ["", null],
    ["-5", null],
    ["12.5", null],
    ["abc", null],
  ])("amount %s -> %s", (i, o) => expect(parseAmount(i)).toBe(o));
  it("year range is Jan to Dec", () => expect(moneyRange("year", "2026-11-12")).toEqual({ from: "2026-01-01", to: "2026-12-31" }));
});

describe("prescription", () => {
  it("keeps filled lines, drops empty ones", () => {
    expect(
      parseRxLines([
        { medicine: "  Tab  Paracetamol 500 ", dose: "1-0-1", timing: "after_food", days: "5", note: "" },
        { medicine: "", days: "" },
        { medicine: "Syp Cough", days: 7, timing: "nonsense" },
      ]),
    ).toEqual([
      { medicine: "Tab Paracetamol 500", dose: "1-0-1", timing: "after_food", days: 5, note: null },
      { medicine: "Syp Cough", dose: null, timing: null, days: 7, note: null },
    ]);
  });
  it.each([[[]], [[{ medicine: "Tab X", days: 0 }]], [[{ medicine: "", days: 5 }]], ["x"], [[{ medicine: "Tab X", days: 400 }]]])(
    "rejects %j",
    (v) => expect(parseRxLines(v)).toBeNull(),
  );
  it("writes a WhatsApp prescription in Hindi", () => {
    const m = rxMessage({
      lang: "hi",
      clinic: "Demo Clinic",
      doctor: "Sharma",
      patient: "Ramesh",
      date: "12 नव॰",
      lines: [{ medicine: "Tab A", dose: "1-0-1", timing: "after_food", days: 5, note: null }],
      nextVisit: "17 नव॰",
    });
    expect(m).toContain("Dr. Sharma का पर्चा");
    expect(m).toContain("1. Tab A — 1-0-1, खाने के बाद, 5 दिन");
    expect(m).toContain("अगली बार मिलें: 17 नव॰");
  });
});
