import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { addDays, periodRange, type Period } from "@/lib/dates";

export type ReportRow = {
  date: string;
  token_number: number;
  slot_time: string;
  status: string;
  source: string;
  created_at: string;
  patient_id: string;
  reminder_id: string | null;
  patient: { name: string; phone: string; age: number | null; gender: string | null } | null;
  afterReminder: boolean;
};

export type Report = {
  period: Period;
  from: string;
  to: string;
  booked: number;
  done: number;
  missed: number;
  walkIn: number;
  qr: number;
  remindersSent: number;
  bookedAfterReminder: number;
  rows: ReportRow[];
};

const istStart = (d: string) => `${d}T00:00:00+05:30`;

/** Numbers for a period. Runs as the logged-in user, so Row Level Security applies. Never reads doctor notes. */
export async function buildReport(clinicId: string, period: Period): Promise<Report> {
  const { from, to } = periodRange(period);
  const supabase = await supabaseServer();
  const [{ data: appts, error: e1 }, { data: rems, error: e2 }] = await Promise.all([
    supabase
      .from("appointments")
      .select("date, token_number, slot_time, status, source, created_at, patient_id, reminder_id, patient:patients(name, phone, age, gender)")
      .eq("clinic_id", clinicId)
      .gte("date", from)
      .lte("date", to)
      .order("date")
      .order("token_number"),
    // reminders from 7 days before the period, to match bookings made after a reminder
    supabase
      .from("reminders")
      .select("patient_id, sent_at")
      .eq("clinic_id", clinicId)
      .not("sent_at", "is", null)
      .gte("sent_at", istStart(addDays(from, -7)))
      .lt("sent_at", istStart(addDays(to, 1))),
  ]);
  if (e1 || e2) throw e1 ?? e2;

  const sentBy = new Map<string, number[]>();
  for (const r of rems ?? []) {
    const list = sentBy.get(r.patient_id) ?? [];
    list.push(new Date(r.sent_at!).getTime());
    sentBy.set(r.patient_id, list);
  }
  const WEEK = 7 * 86_400_000;
  const rows: ReportRow[] = ((appts ?? []) as unknown as Omit<ReportRow, "afterReminder">[]).map((a) => {
    const created = new Date(a.created_at).getTime();
    const afterReminder = !!a.reminder_id || (sentBy.get(a.patient_id) ?? []).some((s) => created >= s && created - s <= WEEK);
    return { ...a, afterReminder };
  });
  const remindersSent = (rems ?? []).filter((r) => r.sent_at! >= istStart(from)).length;

  return {
    period,
    from,
    to,
    booked: rows.length,
    done: rows.filter((r) => r.status === "done").length,
    missed: rows.filter((r) => r.status === "missed").length,
    walkIn: rows.filter((r) => r.source === "attender").length,
    qr: rows.filter((r) => r.source === "qr").length,
    remindersSent,
    bookedAfterReminder: new Set(rows.filter((r) => r.afterReminder).map((r) => r.patient_id)).size,
    rows,
  };
}

export function parsePeriod(p: unknown): Period {
  return p === "week" || p === "month" ? p : "today";
}
