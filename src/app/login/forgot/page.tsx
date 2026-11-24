import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getT } from "@/lib/lang-server";
import { getStaff, ROLE_HOME } from "@/lib/staff";
import { LangSwitch } from "@/components/LangSwitch";
import { BrandMark, BrandName } from "@/components/BrandMark";
import { SupportContact } from "@/components/SupportContact";
import { ResetForm } from "./ResetForm";
import { RESET_WORDS } from "./words";

export const metadata: Metadata = { title: "Forgot password · Clinic Easy" };
export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const staff = await getStaff();
  if (staff) redirect(ROLE_HOME[staff.role]);
  const { lang } = await getT();
  const w = RESET_WORDS[lang];
  const { id } = await searchParams;
  const initialId = typeof id === "string" && /^[6-9][0-9]{9}$/.test(id) ? id : "";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col">
      <section className="relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-[#050b1a] via-[#0b2545] to-teal-700 px-5 pb-16 pt-6 text-white shadow-xl shadow-teal-950/20">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-emerald-300/10" aria-hidden />
        <div className="relative flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <BrandMark size={36} />
            <BrandName />
          </Link>
          <span className="[&_button]:border-white/40 [&_button]:bg-white/10 [&_button]:text-white">
            <LangSwitch />
          </span>
        </div>
        <h1 className="relative mt-8 text-3xl font-bold text-white">{w.title}</h1>
        <p className="relative mt-2 text-lg text-teal-50/90">{w.subtitle}</p>
      </section>
      <div className="relative z-10 -mt-10 px-4 pb-8">
        <ResetForm lang={lang} initialId={initialId} />
        <p className="mt-5 text-center">
          <Link href="/login" className="font-semibold text-teal-700 underline underline-offset-4">
            {w.back}
          </Link>
        </p>
        <p className="mt-5 text-center text-sm text-slate-500">{w.noEmail}</p>
        <div className="mt-4">
          <SupportContact lang={lang} variant="compact" tone="light" />
        </div>
      </div>
    </main>
  );
}
