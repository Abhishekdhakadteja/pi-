// All clinic dates are Indian Standard Time (UTC+5:30, no daylight saving).
const IST_OFFSET_MIN = 330;

/** Today's date in India as YYYY-MM-DD. */
export function todayIST(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
}

/** Current time in India as HH:MM. */
export function nowTimeIST(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MIN * 60_000).toISOString().slice(11, 16);
}

export function addDays(date: string, n: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `date`. */
export function weekStart(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return addDays(date, -dow);
}

export function monthStart(date: string): string {
  return date.slice(0, 8) + "01";
}

export function monthEnd(date: string): string {
  const d = new Date(date.slice(0, 8) + "01T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

export type Period = "today" | "week" | "month";
export function periodRange(period: Period, today = todayIST()): { from: string; to: string } {
  if (period === "week") return { from: weekStart(today), to: addDays(weekStart(today), 6) };
  if (period === "month") return { from: monthStart(today), to: monthEnd(today) };
  return { from: today, to: today };
}

/** Treatment course: medicine for `days` days starting `start` (day 1 = start). */
export function courseDates(start: string, days: number) {
  const end_date = addDays(start, days - 1); // last day of medicine
  return { end_date, next_visit_date: end_date }; // come back before medicine runs out
}

/** "2026-11-11" -> "11 Nov" / "11 नव॰" */
export function formatDate(date: string, lang: "hi" | "en", withWeekday = false): string {
  const d = new Date(date + "T00:00:00Z");
  return d.toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    ...(withWeekday ? { weekday: "short" } : {}),
    timeZone: "UTC",
  });
}

/** "14:30:00" -> "2:30 PM" */
export function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export type MoneyPeriod = Period | "year";
/** Like periodRange, plus the calendar year (Jan–Dec). */
export function moneyRange(period: MoneyPeriod, today = todayIST()): { from: string; to: string } {
  if (period === "year") return { from: today.slice(0, 4) + "-01-01", to: today.slice(0, 4) + "-12-31" };
  return periodRange(period, today);
}
