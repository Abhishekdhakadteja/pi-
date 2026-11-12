import { requireRole } from "@/lib/staff";
import { StaffShell } from "@/components/StaffShell";
import { getT } from "@/lib/lang-server";
import { supabaseServer } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { formatDate } from "@/lib/dates";
import { OptOutForm, TemplateForm } from "./ReminderAdmin";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const staff = await requireRole(["admin"]);
  const { t, lang } = await getT();
  const supabase = await supabaseServer();
  const [{ data: clinic }, { data: reminders }, { data: optedOut }] = await Promise.all([
    supabase.from("clinics").select("reminder_template_hi, reminder_template_en, followup_template_hi, followup_template_en").eq("id", staff.clinic_id).single(),
    supabase
      .from("reminders")
      .select("id, kind, channel, status, sent_at, created_at, opted_out, patient:patients(name, phone)")
      .eq("clinic_id", staff.clinic_id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("patients").select("id, name, phone").eq("clinic_id", staff.clinic_id).eq("opted_out", true).limit(100),
  ]);
  await audit(staff, "view_list", "reminders", null, { count: reminders?.length ?? 0 });
  const rows = (reminders ?? []) as unknown as {
    id: string;
    kind: string;
    channel: string;
    status: string;
    sent_at: string | null;
    created_at: string;
    opted_out: boolean;
    patient: { name: string; phone: string } | null;
  }[];

  return (
    <StaffShell staff={staff}>
      <h1 className="mb-4 text-2xl font-bold">{t("reminders")}</h1>
      <div className="flex flex-col gap-4">
        <section className="card">
          <h2 className="mb-3 text-xl font-bold">{t("remindersSent")}</h2>
          {rows.length === 0 ? (
            <p className="text-slate-500">{t("noReminders")}</p>
          ) : (
            <ul className="flex flex-col divide-y" data-testid="reminder-list">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-3">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{r.patient?.name}</span>
                    <span className="text-sm text-slate-500">
                      {formatDate((r.sent_at ?? r.created_at).slice(0, 10), lang)} · {r.channel.toUpperCase()} ·{" "}
                      {t(r.kind === "follow_up" ? "kind_follow_up" : "kind_first")}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-sm font-semibold">
                    {t(`rstatus_${r.status}` as "rstatus_sent")}
                    {r.opted_out && <span className="block text-red-700">{t("optedOut")}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          {clinic && <TemplateForm hi={clinic.reminder_template_hi} en={clinic.reminder_template_en} fhi={clinic.followup_template_hi} fen={clinic.followup_template_en} />}
        </section>
        <section className="card flex flex-col gap-3">
          <OptOutForm />
          {(optedOut ?? []).length > 0 && (
            <div>
              <h3 className="mt-2 font-bold">{t("optedOut")}</h3>
              <ul className="text-slate-700">
                {optedOut!.map((p) => (
                  <li key={p.id}>
                    {p.name} · {p.phone}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </StaffShell>
  );
}
