import type { Staff } from "@/lib/staff";
import { getT } from "@/lib/lang-server";
import { logout } from "@/app/login/actions";
import { LangSwitch } from "./LangSwitch";
import { BrandMark } from "./BrandMark";
import { NavLinks, type NavItem } from "./NavLinks";
import type { DictKey } from "@/lib/i18n";

const NAV: Record<Staff["role"], { href: string; key: DictKey; icon: NavItem["icon"] }[]> = {
  attender: [
    { href: "/desk", key: "attenderDesk", icon: "desk" },
    { href: "/today", key: "todaysList", icon: "list" },
    { href: "/messages", key: "messages", icon: "messages" },
  ],
  doctor: [
    { href: "/doctor", key: "doctorView", icon: "doctor" },
    { href: "/today", key: "todaysList", icon: "list" },
    { href: "/money", key: "money", icon: "money" },
    { href: "/messages", key: "messages", icon: "messages" },
    { href: "/reports", key: "reports", icon: "reports" },
  ],
  admin: [
    { href: "/admin", key: "settings", icon: "settings" },
    { href: "/desk", key: "attenderDesk", icon: "desk" },
    { href: "/today", key: "todaysList", icon: "list" },
    { href: "/money", key: "money", icon: "money" },
    { href: "/messages", key: "messages", icon: "messages" },
    { href: "/admin/staff", key: "staffNav", icon: "staff" },
    { href: "/reports", key: "reports", icon: "reports" },
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
      <header className="no-print sticky top-0 z-10 -mx-4 mb-5 bg-gradient-to-r from-[#0b3b44] via-teal-800 to-emerald-700 px-4 pb-3 pt-3 text-white shadow-lg shadow-teal-950/20 sm:rounded-b-3xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark size={40} />
            <div className="min-w-0">
              <div className="truncate text-lg font-bold leading-tight">{staff.clinic.name}</div>
              <div className="truncate text-sm text-teal-100/90">
                {staff.name} · {t(`role_${staff.role}` as DictKey)}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 [&_button]:border-white/40 [&_button]:bg-white/10 [&_button]:text-white">
            <LangSwitch />
            <form action={logout}>
              <button className="btn-small bg-white/10 text-white ring-1 ring-white/30">{t("logout")}</button>
            </form>
          </div>
        </div>
        <NavLinks items={NAV[staff.role].map((n) => ({ href: n.href, label: t(n.key), icon: n.icon }))} />
      </header>
      {denied && <p className="error-box mb-4">{t("err_not_allowed")}</p>}
      {children}
    </div>
  );
}
