import { requireRole } from "@/lib/staff";
import { StaffShell } from "@/components/StaffShell";
import { getT } from "@/lib/lang-server";
import { AiBrief } from "@/components/os/AiBrief";
import { DeskClient } from "./DeskClient";

export default async function DeskPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const staff = await requireRole(["attender", "admin"]);
  const { t, lang } = await getT();
  const sp = await searchParams;
  return (
    <StaffShell staff={staff} denied={!!sp.denied}>
      <h1 className="mb-4 text-2xl font-bold">{t("attenderDesk")}</h1>
      <AiBrief staff={staff} lang={lang} compact />
      <DeskClient />
    </StaffShell>
  );
}
