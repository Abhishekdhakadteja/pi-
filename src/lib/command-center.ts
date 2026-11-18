import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { addDays, todayIST } from "@/lib/dates";
import type { Staff } from "@/lib/staff";
import type { DayData } from "@/lib/ai-brief";

export type DayStats = DayData & { collection: number };

/** Everything the AI brief needs for today, in parallel queries (all clinic-scoped by RLS too). */
export async function loadDay(staff: Staff): Promise<DayStats> {
  const today = todayIST();
  const supabase = await supabaseServer();
  const canMoney = staff.role !== "attender";
  const [{ data: appts }, { data: pays }, { data: ending }, { count: follow }, { count: msgs }] = await Promise.all([
    supabase.from("appointments").select("id, status").eq("clinic_id", staff.clinic_id).eq("date", today),
    canMoney
      ? supabase.from("payments").select("amount, appointment_id").eq("clinic_id", staff.clinic_id).eq("paid_on", today)
      : Promise.resolve({ data: [] as { amount: number; appointment_id: string | null }[] }),
    supabase
      .from("treatment_courses")
      .select("patient:patients(name)")
      .eq("clinic_id", staff.clinic_id)
      .gte("end_date", today)
      .lte("end_date", addDays(today, 3))
      .eq("reminder_status", "pending")
      .limit(20),
    supabase
      .from("treatment_courses")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", staff.clinic_id)
      .eq("next_visit_date", today),
    supabase
      .from("reminders")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", staff.clinic_id)
      .in("status", ["manual", "failed"])
      .not("message", "is", null),
  ]);
  const rows = appts ?? [];
  const payRows = pays ?? [];
  return {
    statuses: rows.map((r) => r.status as string),
    doneAppointmentIds: rows.filter((r) => r.status === "done").map((r) => r.id as string),
    paidAppointmentIds: new Set(payRows.map((p) => p.appointment_id).filter((x): x is string => !!x)),
    collection: payRows.reduce((a, p) => a + p.amount, 0),
    medEnding: ((ending ?? []) as unknown as { patient: { name: string } | null }[])
      .map((r) => r.patient?.name)
      .filter((n): n is string => !!n),
    followUpsToday: follow ?? 0,
    pendingMessages: msgs ?? 0,
  };
}
