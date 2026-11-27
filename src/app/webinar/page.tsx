import type { Metadata } from "next";
import Link from "next/link";
import { getLang } from "@/lib/lang-server";
import { BrandMark, BrandName } from "@/components/BrandMark";
import { LangSwitch } from "@/components/LangSwitch";
import { LegalLinks } from "@/components/LegalLinks";
import { cleanRef } from "@/lib/demo";
import { Webinar } from "./Webinar";

export const metadata: Metadata = {
  title: "7-minute webinar: a doctor's day · Clinic Easy AI",
  description: "Watch a doctor's whole day with Clinic Easy AI, from 9 AM to 9 PM, in 7 short chapters. Plays by itself, with voice.",
};

export default async function WebinarPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const lang = await getLang();
  const sp = await searchParams;
  return (
    <main className="os min-h-screen overflow-hidden">
      <div className="mx-auto max-w-2xl px-4 pb-16">
        <header className="flex items-center justify-between py-5">
          <Link href="/" className="flex items-center gap-2.5 text-lg text-white">
            <BrandMark size={38} />
            <BrandName />
          </Link>
          <span className="[&_button]:border [&_button]:border-white/20 [&_button]:bg-white/5 [&_button]:text-white">
            <LangSwitch />
          </span>
        </header>
        <div className="mb-5 text-center">
          <span className="rounded-full border border-violet-300/40 bg-violet-400/10 px-3 py-1 text-xs font-bold tracking-wider text-violet-100">
            {lang === "hi" ? "🎬 7 मिनट का वेबिनार · ऑन-डिमांड" : "🎬 7-MINUTE WEBINAR · ON DEMAND"}
          </span>
          <h1 className="mt-3 text-3xl font-bold text-white">
            <span className="os-gradient-text">{lang === "hi" ? "एक डॉक्टर का पूरा दिन, AI के साथ" : "A doctor's whole day, with AI"}</span>
          </h1>
        </div>
        <Webinar lang={lang} refTag={cleanRef(sp.ref)} />
        <LegalLinks className="mt-10 justify-center" />
      </div>
    </main>
  );
}
