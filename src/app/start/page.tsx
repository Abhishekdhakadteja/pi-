import type { Metadata } from "next";
import Link from "next/link";
import { getLang } from "@/lib/lang-server";
import { BrandMark, BrandName } from "@/components/BrandMark";
import { LangSwitch } from "@/components/LangSwitch";
import { LegalLinks } from "@/components/LegalLinks";
import { cleanRef } from "@/lib/demo";
import { Journey } from "./Journey";

export const metadata: Metadata = {
  title: "60-second clinic check-up · Clinic Easy AI",
  description: "Doctors: see in 60 seconds how many follow-up patients and hours your clinic loses each month, and the plan that fits.",
};

export default async function StartPage({ searchParams }: { searchParams: Promise<{ ref?: string; step?: string }> }) {
  const lang = await getLang();
  const sp = await searchParams;
  return (
    <main className="os min-h-screen overflow-hidden">
      <div className="mx-auto max-w-xl px-4 pb-16">
        <header className="flex items-center justify-between py-5">
          <Link href="/" className="flex items-center gap-2.5 text-lg text-white">
            <BrandMark size={38} />
            <BrandName />
          </Link>
          <span className="[&_button]:border [&_button]:border-white/20 [&_button]:bg-white/5 [&_button]:text-white">
            <LangSwitch />
          </span>
        </header>
        <Journey lang={lang} refTag={cleanRef(sp.ref)} startAt={sp.step === "offer" ? "offer" : null} />
        <LegalLinks className="mt-10 justify-center" />
      </div>
    </main>
  );
}
