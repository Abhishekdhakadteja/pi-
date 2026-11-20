import Link from "next/link";
import { redirect } from "next/navigation";
import { getT } from "@/lib/lang-server";
import { getStaff, ROLE_HOME } from "@/lib/staff";
import { LangSwitch } from "@/components/LangSwitch";
import { BrandMark, BrandName } from "@/components/BrandMark";
import { LoginForm } from "./LoginForm";
import { SupportContact } from "@/components/SupportContact";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const staff = await getStaff();
  if (staff) redirect(ROLE_HOME[staff.role]);
  const { t, lang } = await getT();
  const { id } = await searchParams;
  const initialId = typeof id === "string" && /^[6-9][0-9]{9}$/.test(id) ? id : "";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col">
      <section className="relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-[#050b1a] via-[#0b2545] to-teal-700 px-5 pb-16 pt-6 text-white shadow-xl shadow-teal-950/20">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-emerald-300/10" aria-hidden />
        <div className="relative flex items-center justify-between">
          <span className="flex items-center gap-2 text-xl font-bold">
            <BrandMark size={36} />
            <BrandName />
          </span>
          <span className="[&_button]:border-white/40 [&_button]:bg-white/10 [&_button]:text-white">
            <LangSwitch />
          </span>
        </div>
        <h1 className="relative mt-8 text-3xl font-bold text-white">{t("loginTitle")}</h1>
        <p className="relative mt-2 text-lg text-teal-50/90">{t("loginSubtitle")}</p>
      </section>
      <div className="relative z-10 -mt-10 px-4 pb-8">
        <LoginForm initialId={initialId} />
        <Link
          href="/signup"
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-base shadow-sm ring-1 ring-teal-100 hover:ring-teal-300"
        >
          <span className="text-slate-600">{t("newDoctor")}</span>
          <span className="font-semibold text-teal-700">{t("signupLink")} →</span>
        </Link>
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 1 1 8 0v4" />
          </svg>
          {t("secureNote")}
        </p>
        <div className="mt-6">
          <SupportContact lang={lang} variant="compact" tone="light" />
        </div>
      </div>
    </main>
  );
}
