import Link from "next/link";
import type { Staff } from "@/lib/staff";
import { getT } from "@/lib/lang-server";
import { logout } from "@/app/login/actions";
import { LangSwitch } from "./LangSwitch";
import type { DictKey } from "@/lib/i18n";

const NAV: Record<Staff["role"], { href: string; key: DictKey }[]> = {
  attender: [
    { href: "/desk", key: "attenderDesk" },
    { href: "/today", key: "todaysList" },
    { href: "/messages", key: "messages" },
  ],
  doctor: [
    { href: "/doctor", key: "doctorView" },
    { href: "/today", key: "todaysList" },
    { href: "/money", key: "money" },
    { href: "/messages", key: "messages" },
    { href: "/reports", key: "reports" },
  ],
  admin: [
    { href: "/admin", key: "settings" },
    { href: "/desk", key: "attenderDesk" },
    { href: "/today", key: "todaysList" },
    { href: "/money", key: "money" },
    { href: "/messages", key: "messages" },
    { href: "/admin/staff", key: "staffNav" },
    { href: "/reports", key: "reports" },
  ],
};

export async function StaffShell({
  staff,
  children,
  denied,
}: {
  staff: Staff;
  children: React.ReactNode;
  denied?: boolean;
}) {
  const { t } = await getT();
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-16">
      <header className="no-print sticky top-0 z-10 -mx-4 mb-4 bg-white/95 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-lg font-bold text-teal-800">{staff.clinic.name}</div>
            <div className="truncate text-sm text-slate-500">{staff.name}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LangSwitch />
            <form action={logout}>
              <button className="btn-small bg-slate-100 text-slate-700">{t("logout")}</button>
            </form>
          </div>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto">
          {NAV[staff.role].map((n) => (
            <Link key={n.href} href={n.href} className="btn-small shrink-0 bg-teal-50 text-teal-900">
              {t(n.key)}
            </Link>
          ))}
        </nav>
      </header>
      {denied && <p className="error-box mb-4">{t("err_not_allowed")}</p>}
      {children}
    </div>
  );
}
