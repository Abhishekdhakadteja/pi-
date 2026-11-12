import { requireRole } from "@/lib/staff";
import { StaffShell } from "@/components/StaffShell";
import { getT } from "@/lib/lang-server";
import { supabaseServer } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { formatDate } from "@/lib/dates";
import { waLink } from "@/lib/share";
import { PrepareButton, SendRow } from "./MessageRow";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const staff = await requireRole(["attender", "doctor", "admin"]);
  const { t, lang } = await getT();
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("reminders")
    .select("id, kind, message, created_at, status, patient:patients(name, phone, opted_out)")
    .eq("clinic_id", staff.clinic_id)
    .in("status", ["manual", "failed"])
    .not("message", "is", null)
    .order("created_at", { ascending: true })
    .limit(100);
  const rows = ((data ?? []) as unknown as {
    id: string;
    kind: "first" | "follow_up";
    message: string;
    created_at: string;
    patient: { name: string; phone: string; opted_out: boolean } | null;
  }[]).filter((r) => r.patient && !r.patient.opted_out);
  await audit(staff, "view_list", "reminders", null, { pending: rows.length });

  return (
    <StaffShell staff={staff}>
      <h1 className="mb-2 text-2xl font-bold">{t("messagesTitle")}</h1>
      <p className="mb-4 text-slate-600">{t("messagesHelp")}</p>
      <PrepareButton />
      <ul className="mt-4 flex flex-col gap-3" data-testid="messages-list">
        {rows.length === 0 && <li className="card text-center text-lg text-slate-500">{t("nothingToSend")}</li>}
        {rows.map((r) => (
          <li key={r.id} className="card flex flex-col gap-2 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-lg font-semibold">{r.patient!.name}</span>
              <span className="shrink-0 text-sm text-slate-500">
                {t(r.kind === "first" ? "kind_first" : "kind_follow_up")} · {formatDate(r.created_at.slice(0, 10), lang)}
              </span>
            </div>
            <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-sm text-slate-700">{r.message}</p>
            <SendRow id={r.id} href={waLink(r.patient!.phone, r.message)} />
          </li>
        ))}
      </ul>
    </StaffShell>
  );
}
