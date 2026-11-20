import type { Metadata } from "next";
import Link from "next/link";
import { getLang } from "@/lib/lang-server";
import { getHealthWords } from "@/lib/health/words";
import { BrandMark, BrandName } from "@/components/BrandMark";
import { LangSwitch } from "@/components/LangSwitch";

export const metadata: Metadata = {
  title: "Clinic Easy Health: डॉक्टर खोजें, मेरा दिन",
  description: "बीमारी लिखें, अपने शहर के सही विशेषज्ञ डॉक्टर पाएं और रोज़ का सेहतमंद रूटीन बनाएं।",
};

// Shared frame for the public side used by common people (patients and families).
export default async function HealthLayout({ children }: { children: React.ReactNode }) {
  const w = getHealthWords(await getLang());
  return (
    <div className="health min-h-screen bg-[#030712] text-slate-200">
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="landing-grid absolute inset-0 opacity-30" />
        <div className="absolute -left-32 -top-40 h-[26rem] w-[26rem] rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute -right-40 top-60 h-[24rem] w-[24rem] rounded-full bg-violet-600/15 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-3xl px-4 pb-16">
        <header className="flex items-center justify-between gap-2 py-4">
          <Link href="/health" className="flex items-center gap-2 text-white" data-testid="health-home">
            <BrandMark size={34} />
            <span className="flex flex-col leading-tight">
              <BrandName />
              <span className="text-xs text-cyan-200/80">{w.brandSub}</span>
            </span>
          </Link>
          <span className="[&_button]:border [&_button]:border-white/20 [&_button]:bg-white/5 [&_button]:text-white">
            <LangSwitch />
          </span>
        </header>
        <nav className="mb-5 grid grid-cols-2 gap-2 text-center text-base font-semibold">
          <Link href="/health/doctors" className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-3 text-cyan-100">
            🩺 {w.navDoctors}
          </Link>
          <Link href="/health/routine" className="rounded-2xl border border-violet-400/30 bg-violet-400/10 px-3 py-3 text-violet-100">
            🗓️ {w.navRoutine}
          </Link>
        </nav>
        {children}
        <footer className="mt-12 border-t border-white/10 pt-5 text-center text-sm text-slate-400">
          <Link href="/" className="underline decoration-dotted underline-offset-4 hover:text-white">
            {w.navForDoctors}
          </Link>
        </footer>
      </div>
    </div>
  );
}
