import type { Staff } from "@/lib/staff";
import { getT } from "@/lib/lang-server";
import { logout } from "@/app/login/actions";
import { LangSwitch } from "./LangSwitch";
import { BrandMark } from "./BrandMark";
import { NavLinks, type NavItem } from "./NavLinks";
import type { DictKey } from "@/lib/i18n";
import { SupportContact } from "./SupportContact";
import { ProBadge } from "./ProBadge";
import { getPlanState } from "@/lib/subscription";
import Link from "next/link";
import { aiConfigured } from "@/lib/ai";
import { AiManager } from "./os/AiManager";
import { OfflineHelper } from "./OfflineToday";
import { DemoBanner } from "./DemoBanner";

const NAV: Record<Staff["role"], { href: string; key: DictKey; icon: NavItem["icon"] }[]> = {
  attender: [
    { href: "/ai", key: "aiCenter", icon: "ai" },
    { href: "/desk", key: "attenderDesk", icon: "desk" },
    { href: "/today", key: "todaysList", icon: "list" },
    { href: "/messages", key: "messages", icon: "messages" },
  ],
  doctor: [
    { href: "/doctor", key: "doctorView", icon: "doctor" },
    { href: "/ai", key: "aiCenter", icon: "ai" },
    { href: "/today", key: "todaysList", icon: "list" },
    { href: "/money", key: "money", icon: "money" },
    { href: "/messages", key: "messages", icon: "messages" },
    { href: "/reports", key: "reports", icon: "reports" },
    { href: "/pro", key: "proNav", icon: "pro" },
  ],
  admin: [
    { href: "/ai", key: "aiCenter", icon: "ai" },
    { href: "/admin", key: "settings", icon: "settings" },
    { href: "/desk", key: "attenderDesk", icon: "desk" },
    { href: "/today", key: "todaysList", icon: "list" },
    { href: "/money", key: "money", icon: "money" },
    { href: "/messages", key: "messages", icon: "messages" },
    { href: "/admin/staff", key: "staffNav", icon: "staff" },
    { href: "/admin/tracking", key: "trackingNav", icon: "staff" },
    { href: "/reports", key: "reports", icon: "reports" },
    { href: "/pro", key: "proNav", icon: "pro" },
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
  const [{ t, lang }, plan] = await Promise.all([getT(), getPlanState(staff.clinic_id)]);
  return (
    <div className="os min-h-screen">
      <div className="mx-auto min-h-screen max-w-3xl px-4 pb-28">
        {staff.demo && <DemoBanner exp={staff.demo.exp} lang={lang} />}
        <header className="no-print sticky top-0 z-20 -mx-4 mb-5 border-b border-cyan-400/15 bg-[#030712]/85 px-4 pb-2.5 pt-3 backdrop-blur-xl sm:rounded-b-3xl sm:border-x">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <BrandMark size={40} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-lg font-bold leading-tight text-white">{staff.clinic.name}</span>
                  {plan.pro ? (
                    <Link href="/pro" aria-label="Clinic Easy Pro">
                      <ProBadge label={plan.tier === "pro_max" ? "MAX" : plan.trial ? "TRIAL" : "PRO"} />
                    </Link>
                  ) : (
                    <span className="hidden shrink-0 items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 font-brand text-[10px] font-bold tracking-[0.2em] text-cyan-200 sm:inline-flex">
                      <span className="os-live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      AI OS
                    </span>
                  )}
                </div>
                <div className="truncate text-sm text-slate-400">
                  {staff.name} · {t(`role_${staff.role}` as DictKey)}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 [&_button]:border-white/20 [&_button]:bg-white/5 [&_button]:text-white">
              <LangSwitch />
              <form action={logout}>
                <button className="btn-small bg-white/5 text-white ring-1 ring-white/20">{t("logout")}</button>
              </form>
            </div>
          </div>
          <NavLinks items={NAV[staff.role].map((n) => ({ href: n.href, label: t(n.key), icon: n.icon }))} />
        </header>
        {denied && <p className="error-box mb-4">{t("err_not_allowed")}</p>}
        {children}
        <footer className="no-print mt-10">
          <SupportContact lang={lang} variant="compact" tone="dark" />
          <p className="mt-4 text-center font-brand text-[11px] tracking-[0.25em] text-slate-500">CLINIC EASY · AI CLINIC OS</p>
        </footer>
      </div>
      <OfflineHelper />
      <AiManager role={staff.role} mode={!aiConfigured() ? "key" : plan.pro ? "on" : "pro"} />
    </div>
  );
}
