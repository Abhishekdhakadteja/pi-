import { requireRole } from "@/lib/staff";
import { StaffShell } from "@/components/StaffShell";
import { getT } from "@/lib/lang-server";
import { supabaseServer } from "@/lib/supabase/server";
import { ActiveToggle, AddStaffForm } from "./StaffForms";
import type { DictKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const staff = await requireRole(["admin"]);
  const { t } = await getT();
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("users")
    .select("id, name, phone, email, role, active")
    .eq("clinic_id", staff.clinic_id)
    .order("active", { ascending: false })
    .order("created_at");
  return (
    <StaffShell staff={staff}>
      <h1 className="mb-4 text-2xl font-bold">{t("staffNav")}</h1>
      <section className="card mb-4">
        <ul className="flex flex-col divide-y" data-testid="staff-list">
          {(data ?? []).map((u) => (
            <li key={u.id} className={`flex items-center gap-3 py-3 ${u.active ? "" : "opacity-60"}`}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-semibold">{u.name}</span>
                <span className="block truncate text-sm text-slate-500">
                  {t(`role_${u.role}` as DictKey)}
                  {u.phone && ` · ${u.phone}`}
                  {u.email && !u.email.endsWith("@staff.clinicease.local") && ` · ${u.email}`}
                  {!u.active && ` · ${t("inactive")}`}
                </span>
              </span>
              {u.id !== staff.id && <ActiveToggle id={u.id} active={u.active} />}
            </li>
          ))}
        </ul>
      </section>
      <section className="card">
        <h2 className="mb-3 text-xl font-bold">{t("addStaff")}</h2>
        <AddStaffForm />
      </section>
    </StaffShell>
  );
}
