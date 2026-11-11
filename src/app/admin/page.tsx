import { requireRole } from "@/lib/staff";
import { StaffShell } from "@/components/StaffShell";
import { getT } from "@/lib/lang-server";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const staff = await requireRole(["admin"]);
  const { t } = await getT();
  const sp = await searchParams;
  return (
    <StaffShell staff={staff} denied={!!sp.denied}>
      <h1 className="text-2xl font-bold">{t("settings")}</h1>
    </StaffShell>
  );
}
