import type { Metadata } from "next";
import Link from "next/link";
import { getLang } from "@/lib/lang-server";
import { getProWords } from "@/lib/pro-content";
import { BrandMark, BrandName } from "@/components/BrandMark";
import { LangSwitch } from "@/components/LangSwitch";
import { ProBadge } from "@/components/ProBadge";
import { PricingPlans } from "@/components/pro/PricingPlans";
import { SupportContact } from "@/components/SupportContact";

export const metadata: Metadata = {
  title: "Clinic Easy Pro · Plans",
  description: "Clinic Easy plans: 7 AI agents in Basic, every AI service in Pro. Launch offer up to 90% off.",
};

// Public pricing page. Buttons send the doctor to log in and then to /pro inside the app.
export default async function PricingPage() {
  const lang = await getLang();
  const w = getProWords(lang);
  return (
    <main className="os min-h-screen overflow-hidden">
      <div className="mx-auto max-w-5xl px-4 pb-16">
        <header className="flex items-center justify-between py-5">
          <Link href="/" className="flex items-center gap-2.5 text-lg text-white">
            <BrandMark size={38} />
            <BrandName />
          </Link>
          <span className="[&_button]:border [&_button]:border-white/20 [&_button]:bg-white/5 [&_button]:text-white">
            <LangSwitch />
          </span>
        </header>
        <section className="flex flex-col items-center pb-8 pt-4 text-center">
          <ProBadge size="lg" />
          <span className="mt-5 text-sm font-semibold tracking-wide text-pink-200">{w.heroKicker}</span>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold md:text-5xl">
            <span className="os-gradient-text">{w.heroTitle}</span>
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-300">{w.heroSub}</p>
        </section>
        <PricingPlans lang={lang} ctx={{ mode: "public" }} />
        <div className="mt-10">
          <SupportContact lang={lang} variant="compact" tone="dark" />
        </div>
      </div>
    </main>
  );
}
