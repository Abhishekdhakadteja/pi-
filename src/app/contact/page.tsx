import type { Metadata } from "next";
import Link from "next/link";
import { getLang } from "@/lib/lang-server";
import { BrandMark, BrandName } from "@/components/BrandMark";
import { LangSwitch } from "@/components/LangSwitch";
import { TeamContact } from "@/components/TeamContact";
import { LegalLinks } from "@/components/LegalLinks";

export const metadata: Metadata = {
  title: "Contact · Clinic Easy",
  description: "Call, WhatsApp or email the Clinic Easy founders: Sales and Technical support. Made in Bharat.",
};

export default async function ContactPage() {
  const lang = await getLang();
  return (
    <main className="os min-h-screen overflow-hidden">
      <div className="mx-auto max-w-4xl px-4 pb-16">
        <header className="flex items-center justify-between py-5">
          <Link href="/" className="flex items-center gap-2.5 text-lg text-white">
            <BrandMark size={38} />
            <BrandName />
          </Link>
          <span className="[&_button]:border [&_button]:border-white/20 [&_button]:bg-white/5 [&_button]:text-white">
            <LangSwitch />
          </span>
        </header>
        <div className="pt-4">
          <TeamContact lang={lang} />
        </div>
        <p className="mt-8 text-center text-sm">
          <Link href="/pricing" className="text-cyan-300 underline-offset-4 hover:underline">
            {lang === "hi" ? "प्लान और कीमतें देखें →" : "See plans and prices →"}
          </Link>
        </p>
        <LegalLinks className="mt-4 justify-center" />
      </div>
    </main>
  );
}
