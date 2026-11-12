import { requireRole } from "@/lib/staff";
import { StaffShell } from "@/components/StaffShell";
import { getT } from "@/lib/lang-server";
import { supabaseServer } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { formatDate, formatTime, todayIST } from "@/lib/dates";
import { Counters, countStatuses } from "@/components/Counters";
import { LiveRefresh } from "@/components/LiveRefresh";
import { StatusBadge } from "@/components/StatusBadge";
import { MissedButton } from "./MissedButton";
import { ComplaintEdit } from "./ComplaintEdit";
import { FeeButton } from "@/components/FeeButton";
import { rupees } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const staff = await requireRole(["attender", "doctor", "admin"]);
  const { t, lang } = await getT();
  const today = todayIST();
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("appointments")
    .select("id, token_number, slot_time, status, source, complaint, patient:patients(name, age)")
    .eq("clinic_id", staff.clinic_id)
    .eq("date", today)
    .order("token_number");
  const rows = (data ?? []) as unknown as {
    id: string;
    token_number: number;
    slot_time: string;
    status: string;
    source: string;
    complaint: string | null;
    patient: { name: string; age: number | null } | null;
  }[];
  await audit(staff, "view_list", "appointments", null, { date: today, count: rows.length });
  const { data: pays } = await supabase
    .from("payments")
    .select("id, appointment_id, amount, discount, mode, kind")
    .eq("clinic_id", staff.clinic_id)
    .eq("paid_on", today);
  const paidBy = new Map<string, { id: string; amount: number; discount: number; mode: string }>();
  let collection = 0;
  for (const p of pays ?? []) {
    collection += p.amount;
    if (p.appointment_id && p.kind === "consultation")
      paidBy.set(p.appointment_id, { id: p.id, amount: p.amount, discount: p.discount, mode: p.mode });
  }
  const c = countStatuses(rows);
  const canMarkMissed = staff.role !== "doctor";

  return (
    <StaffShell staff={staff}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {t("todaysList")} <span className="text-lg font-normal text-slate-500">{formatDate(today, lang, true)}</span>
        </h1>
        <LiveRefresh clinicId={staff.clinic_id} date={today} />
      </div>
      <Counters {...c} t={t} />
      <div className="card mt-3 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-white p-3">
        <span className="text-lg text-slate-600">{t("todayCollection")}</span>
        <span className="text-2xl font-black text-green-700" data-testid="today-collection">{rupees(collection)}</span>
      </div>
      <ul className="mt-4 flex flex-col gap-2" data-testid="today-list">
        {rows.length === 0 && <li className="card text-center text-lg text-slate-500">{t("noPatientsToday")}</li>}
        {rows.map((r) => (
          <li key={r.id} className="card flex flex-wrap items-center gap-3 p-3" data-testid={`row-${r.token_number}`}>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 text-2xl font-black text-white shadow-md shadow-teal-900/20">{r.token_number}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-lg font-semibold">{r.patient?.name}</span>
              <span className="text-sm text-slate-500">
                {formatTime(r.slot_time)} · {t(r.source === "qr" ? "source_qr" : "source_attender")}
              </span>
              <ComplaintEdit appointmentId={r.id} complaint={r.complaint} />
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <StatusBadge status={r.status} t={t} />
              {canMarkMissed && ["booked", "waiting", "in_room"].includes(r.status) && <MissedButton id={r.id} />}
            </span>
            {r.status !== "missed" && (
              <span className="flex w-full justify-end">
                <FeeButton
                  appointmentId={r.id}
                  defaultFee={staff.clinic.default_fee}
                  upiId={staff.clinic.upi_id}
                  payee={staff.clinic.name}
                  paid={paidBy.get(r.id) ?? null}
                />
              </span>
            )}
          </li>
        ))}
      </ul>
    </StaffShell>
  );
}
