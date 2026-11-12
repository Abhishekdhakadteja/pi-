import Link from "next/link";
import { requireRole } from "@/lib/staff";
import { StaffShell } from "@/components/StaffShell";
import { getT } from "@/lib/lang-server";
import { supabaseServer } from "@/lib/supabase/server";
import { ClinicForm } from "./ClinicForm";
import { getOwner } from "@/lib/owner";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const staff = await requireRole(["admin"]);
  const { t } = await getT();
  const sp = await searchParams;
  const owner = await getOwner();
  const supabase = await supabaseServer();
  const { data: clinic } = await supabase
    .from("clinics")
    .select("name, address, phone, slots_per_day, opening_time, closing_time, upi_id, default_fee, booking_otp")
    .eq("id", staff.clinic_id)
    .single();
  return (
    <StaffShell staff={staff} denied={!!sp.denied}>
      <h1 className="mb-4 text-2xl font-bold">{t("settings")}</h1>
      <div className="flex flex-col gap-4">
        {owner && (
          <Link href="/owner" className="btn-secondary min-h-16 border-2 border-amber-400 text-xl">
            ★ Owner: सभी clinics / नई clinic
          </Link>
        )}
        <Link href="/admin/poster" className="btn-primary min-h-20 text-2xl">
          ▦ {t("generateQr")}
        </Link>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/admin/staff" className="btn-secondary">{t("staffNav")}</Link>
          <Link href="/money" className="btn-secondary">{t("balanceSheet")}</Link>
          <Link href="/messages" className="btn-secondary">{t("messages")}</Link>
          <Link href="/admin/reminders" className="btn-secondary">{t("reminders")}</Link>
        </div>
        <section className="card">
          <h2 className="mb-3 text-xl font-bold">{t("clinicSettings")}</h2>
          {clinic && <ClinicForm clinic={clinic} />}
        </section>
      </div>
    </StaffShell>
  );
}
