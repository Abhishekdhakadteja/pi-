import type { Metadata } from "next";
import Link from "next/link";
import { getLang } from "@/lib/lang-server";
import { getProWords } from "@/lib/pro-content";
import { BrandMark, BrandName } from "@/components/BrandMark";
import { LangSwitch } from "@/components/LangSwitch";
import { LegalLinks } from "@/components/LegalLinks";
import { ProBadge } from "@/components/ProBadge";
import { PricingPlans } from "@/components/pro/PricingPlans";
import { TeamContact } from "@/components/TeamContact";

export const metadata: Metadata = {
  title: "Clinic Easy Pro · Plans",
  description: "Clinic Easy plans: Basic ₹499, Pro ₹2,999 with every AI service, Pro Max with live staff tracking.",
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
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/demo?ref=pricing" className="btn-small border border-amber-300/50 bg-amber-300/10 text-amber-50" data-testid="pricing-demo">
              {lang === "hi" ? "▶ ख़रीदने से पहले 5 मिनट का LIVE डेमो" : "▶ 5-minute LIVE demo before you buy"}
            </Link>
            <Link href="/start?ref=pricing" className="btn-small border border-pink-300/50 bg-pink-400/10 text-pink-50">
              {lang === "hi" ? "🩺 कौन सा प्लान मेरे लिए? (60 सेकंड)" : "🩺 Which plan fits me? (60 sec)"}
            </Link>
            <Link href="/whatsapp" className="btn-small border border-emerald-400/50 bg-emerald-500/15 text-emerald-50">
              💬 WhatsApp
            </Link>
          </div>
        </section>
        <PricingPlans lang={lang} ctx={{ mode: "public" }} />
        <div className="mt-10">
          <TeamContact lang={lang} />
        </div>
        <LegalLinks className="mt-8 justify-center" />
      </div>
    </main>
  );
}
