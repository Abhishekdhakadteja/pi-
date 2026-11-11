import Link from "next/link";
import { requireRole } from "@/lib/staff";
import { StaffShell } from "@/components/StaffShell";
import { getT } from "@/lib/lang-server";
import { audit } from "@/lib/audit";
import { buildReport, parsePeriod } from "@/lib/report";
import { formatDate } from "@/lib/dates";
import type { DictKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const PERIODS: { key: "today" | "week" | "month"; label: DictKey }[] = [
  { key: "today", label: "today" },
  { key: "week", label: "thisWeek" },
  { key: "month", label: "thisMonth" },
];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const staff = await requireRole(["admin", "doctor"]);
  const { t, lang } = await getT();
  const period = parsePeriod((await searchParams).p);
  const r = await buildReport(staff.clinic_id, period);
  await audit(staff, "view_report", "appointments", null, { period });

  const stats: { label: DictKey; value: number; testid: string }[] = [
    { label: "booked", value: r.booked, testid: "r-booked" },
    { label: "done", value: r.done, testid: "r-done" },
    { label: "missed", value: r.missed, testid: "r-missed" },
    { label: "walkIn", value: r.walkIn, testid: "r-walkin" },
    { label: "qrBookings", value: r.qr, testid: "r-qr" },
    { label: "remindersSent", value: r.remindersSent, testid: "r-reminders" },
    { label: "bookedAfterReminder", value: r.bookedAfterReminder, testid: "r-after" },
  ];

  return (
    <StaffShell staff={staff}>
      <h1 className="mb-4 text-2xl font-bold">{t("reports")}</h1>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/reports?p=${p.key}`}
            className={`btn-small ${period === p.key ? "bg-teal-700 text-white" : "bg-white text-teal-900 ring-1 ring-slate-200"}`}
          >
            {t(p.label)}
          </Link>
        ))}
      </div>
      <p className="mb-3 text-slate-600">
        {formatDate(r.from, lang)} – {formatDate(r.to, lang)}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card flex flex-col p-4">
            <span className="text-4xl font-black text-teal-800" data-testid={s.testid}>{s.value}</span>
            <span className="text-slate-600">{t(s.label)}</span>
          </div>
        ))}
      </div>
      <a href={`/api/reports/export?p=${period}`} className="btn-primary mt-5" data-testid="export">
        ⬇ {t("exportExcel")}
      </a>
    </StaffShell>
  );
}
