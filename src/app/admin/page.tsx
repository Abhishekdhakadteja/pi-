import Link from "next/link";
import { requireRole } from "@/lib/staff";
import { StaffShell } from "@/components/StaffShell";
import { getT } from "@/lib/lang-server";
import { supabaseServer } from "@/lib/supabase/server";
import { ClinicForm } from "./ClinicForm";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const staff = await requireRole(["admin"]);
  const { t } = await getT();
  const sp = await searchParams;
  const supabase = await supabaseServer();
  const { data: clinic } = await supabase
    .from("clinics")
    .select("name, address, phone, slots_per_day, opening_time, closing_time")
    .eq("id", staff.clinic_id)
    .single();
  return (
    <StaffShell staff={staff} denied={!!sp.denied}>
      <h1 className="mb-4 text-2xl font-bold">{t("settings")}</h1>
      <div className="flex flex-col gap-4">
        <Link href="/admin/poster" className="btn-primary min-h-20 text-2xl">
          ▦ {t("generateQr")}
        </Link>
        <Link href="/admin/reminders" className="btn-secondary">{t("reminders")}</Link>
        <section className="card">
          <h2 className="mb-3 text-xl font-bold">{t("clinicSettings")}</h2>
          {clinic && <ClinicForm clinic={clinic} />}
        </section>
      </div>
    </StaffShell>
  );
}
