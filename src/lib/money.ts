// Balance sheet maths. Pure functions (unit tested). Amounts are whole rupees.

export type PaymentRow = { amount: number; discount: number; mode: string; kind: string; paid_on: string };
export type ExpenseRow = { amount: number; category: string; spent_on: string };

export type MoneySummary = {
  income: number;
  discount: number;
  expenses: number;
  net: number;
  byMode: Record<string, number>;
  byKind: Record<string, number>;
  byCategory: Record<string, number>;
  byDay: { day: string; income: number; expenses: number }[];
};

function add(m: Record<string, number>, k: string, v: number) {
  m[k] = (m[k] ?? 0) + v;
}

export function summarize(payments: PaymentRow[], expenses: ExpenseRow[]): MoneySummary {
  const s: MoneySummary = { income: 0, discount: 0, expenses: 0, net: 0, byMode: {}, byKind: {}, byCategory: {}, byDay: [] };
  const days = new Map<string, { income: number; expenses: number }>();
  const day = (d: string) => days.get(d) ?? days.set(d, { income: 0, expenses: 0 }).get(d)!;
  for (const p of payments) {
    s.income += p.amount;
    s.discount += p.discount;
    add(s.byMode, p.mode, p.amount);
    add(s.byKind, p.kind, p.amount);
    day(p.paid_on).income += p.amount;
  }
  for (const e of expenses) {
    s.expenses += e.amount;
    add(s.byCategory, e.category, e.amount);
    day(e.spent_on).expenses += e.amount;
  }
  s.net = s.income - s.expenses;
  s.byDay = [...days.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([d, v]) => ({ day: d, ...v }));
  return s;
}

/** "₹12,500" in Indian digit grouping. */
export function rupees(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

/** Whole rupees from a form field; null when empty or invalid. */
export function parseAmount(input: unknown, min = 0, max = 10_000_000): number | null {
  if (input === null || input === undefined || String(input).trim() === "") return null;
  const n = Number(String(input).replace(/[,₹\s]/g, ""));
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}
