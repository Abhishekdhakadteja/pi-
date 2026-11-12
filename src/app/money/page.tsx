import Link from "next/link";
import { requireRole } from "@/lib/staff";
import { StaffShell } from "@/components/StaffShell";
import { getT } from "@/lib/lang-server";
import { supabaseServer } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { formatDate, moneyRange, type MoneyPeriod } from "@/lib/dates";
import { rupees, summarize, type ExpenseRow, type PaymentRow } from "@/lib/money";
import type { DictKey } from "@/lib/i18n";
import { DeleteEntry, EditEntry, ExpenseForm, IncomeForm, type EditableEntry } from "./MoneyForms";

export const dynamic = "force-dynamic";
const PERIODS: { p: MoneyPeriod; key: DictKey }[] = [
  { p: "today", key: "today" },
  { p: "week", key: "thisWeek" },
  { p: "month", key: "thisMonth" },
  { p: "year", key: "thisYear" },
];

export default async function MoneyPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const staff = await requireRole(["doctor", "admin"]);
  const { t, lang } = await getT();
  const sp = await searchParams;
  const period: MoneyPeriod = (["today", "week", "month", "year"] as const).find((x) => x === sp.p) ?? "month";
  const { from, to } = moneyRange(period);
  const supabase = await supabaseServer();
  const [{ data: pays }, { data: exps }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, amount, discount, mode, kind, paid_on, note, created_at, patient:patients(name), appointment:appointments(reminder_id)")
      .eq("clinic_id", staff.clinic_id)
      .gte("paid_on", from)
      .lte("paid_on", to)
      .order("created_at", { ascending: false }),
    supabase
      .from("expenses")
      .select("id, amount, category, spent_on, note, created_at")
      .eq("clinic_id", staff.clinic_id)
      .gte("spent_on", from)
      .lte("spent_on", to)
      .order("created_at", { ascending: false }),
  ]);
  type Pay = PaymentRow & { id: string; note: string | null; patient: { name: string } | null; appointment: { reminder_id: string | null } | null };
  type Exp = ExpenseRow & { id: string; note: string | null };
  const payments = (pays ?? []) as unknown as Pay[];
  const expenses = (exps ?? []) as unknown as Exp[];
  const s = summarize(payments, expenses);
  const fromReminders = payments.filter((p) => p.appointment?.reminder_id).reduce((a, p) => a + p.amount, 0);
  const returned = payments.filter((p) => p.appointment?.reminder_id).length;
  await audit(staff, "view", "payments", null, { period });

  const recent = [
    ...payments.map((p) => ({
      id: p.id,
      table: "payments" as const,
      day: p.paid_on,
      label: p.patient?.name ?? t(`pkind_${p.kind}` as DictKey),
      sub: `${t(`pkind_${p.kind}` as DictKey)} · ${t(`mode_${p.mode}` as DictKey)}${p.note ? " · " + p.note : ""}`,
      amount: p.amount,
      edit: { table: "payments", id: p.id, amount: p.amount, discount: p.discount, mode: p.mode, kind: p.kind, note: p.note } as EditableEntry,
    })),
    ...expenses.map((e) => ({
      id: e.id,
      table: "expenses" as const,
      day: e.spent_on,
      label: t(`cat_${e.category}` as DictKey),
      sub: e.note ?? "",
      amount: -e.amount,
      edit: { table: "expenses", id: e.id, amount: e.amount, category: e.category, note: e.note } as EditableEntry,
    })),
  ]
    .sort((a, b) => b.day.localeCompare(a.day))
    .slice(0, 60);

  return (
    <StaffShell staff={staff}>
      <h1 className="mb-3 text-2xl font-bold">{t("balanceSheet")}</h1>
      <nav className="mb-4 grid grid-cols-4 gap-2">
        {PERIODS.map((x) => (
          <Link key={x.p} href={`/money?p=${x.p}`} className={`btn-small text-center ${x.p === period ? "bg-gradient-to-r from-teal-700 to-emerald-600 text-white shadow-md" : "bg-white text-teal-900 ring-1 ring-slate-200"}`}>
            {t(x.key)}
          </Link>
        ))}
      </nav>

      <section className="grid grid-cols-3 gap-2 text-center" data-testid="money-summary">
        <div className="card bg-gradient-to-b from-emerald-50 to-white p-3">
          <div className="text-sm text-slate-500">{t("income")}</div>
          <div className="text-xl font-black text-green-700">{rupees(s.income)}</div>
        </div>
        <div className="card bg-gradient-to-b from-rose-50 to-white p-3">
          <div className="text-sm text-slate-500">{t("expensesWord")}</div>
          <div className="text-xl font-black text-red-700">{rupees(s.expenses)}</div>
        </div>
        <div className="card bg-gradient-to-b from-teal-50 to-white p-3">
          <div className="text-sm text-slate-500">{t("net")}</div>
          <div className={`text-xl font-black ${s.net >= 0 ? "text-teal-800" : "text-red-700"}`}>{rupees(s.net)}</div>
        </div>
      </section>

      <section className="card mt-3 p-3">
        <div className="flex items-center justify-between">
          <span className="text-slate-600">
            {t("returnedPatients")}: <b>{returned}</b>
          </span>
          <span className="font-bold text-green-700">{rupees(fromReminders)}</span>
        </div>
        <p className="text-sm text-slate-500">{t("returnValue")}</p>
      </section>

      <section className="card mt-3 p-3">
        <h2 className="mb-2 font-bold">{t("byMode")}</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(s.byMode).map(([m, v]) => (
            <span key={m} className="rounded-lg bg-slate-100 px-3 py-1">
              {t(`mode_${m}` as DictKey)}: <b>{rupees(v)}</b>
            </span>
          ))}
          {Object.entries(s.byCategory).map(([c, v]) => (
            <span key={c} className="rounded-lg bg-red-50 px-3 py-1 text-red-900">
              {t(`cat_${c}` as DictKey)}: <b>{rupees(v)}</b>
            </span>
          ))}
          {s.income + s.expenses === 0 && <span className="text-slate-500">{t("noMoneyYet")}</span>}
        </div>
      </section>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <section className="card p-3">
          <h2 className="mb-2 font-bold">{t("addExpense")}</h2>
          <ExpenseForm />
        </section>
        <section className="card p-3">
          <h2 className="mb-2 font-bold">{t("addIncome")}</h2>
          <IncomeForm />
        </section>
      </div>

      {s.byDay.length > 1 && (
        <section className="card mt-3 p-3">
          <h2 className="mb-2 font-bold">{t("byDay")}</h2>
          <table className="w-full text-left">
            <tbody>
              {s.byDay.map((d) => (
                <tr key={d.day} className="border-t">
                  <td className="py-1">{formatDate(d.day, lang, true)}</td>
                  <td className="py-1 text-right text-green-700">{rupees(d.income)}</td>
                  <td className="py-1 text-right text-red-700">{d.expenses ? "−" + rupees(d.expenses) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="card mt-3 p-3">
        <ul className="flex flex-col divide-y">
          {recent.map((r) => (
            <li key={r.table + r.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{r.label}</span>
                <span className="block truncate text-sm text-slate-500">
                  {formatDate(r.day, lang)} {r.sub && `· ${r.sub}`}
                </span>
              </span>
              <span className={`font-bold ${r.amount >= 0 ? "text-green-700" : "text-red-700"}`}>
                {r.amount >= 0 ? rupees(r.amount) : "−" + rupees(-r.amount)}
              </span>
              <EditEntry entry={r.edit} />
              {(r.table === "expenses" || staff.role === "admin") && <DeleteEntry table={r.table} id={r.id} />}
            </li>
          ))}
        </ul>
      </section>
    </StaffShell>
  );
}
