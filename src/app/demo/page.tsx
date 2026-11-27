import type { Metadata } from "next";
import Link from "next/link";
import { getLang } from "@/lib/lang-server";
import { BrandMark, BrandName } from "@/components/BrandMark";
import { LangSwitch } from "@/components/LangSwitch";
import { LegalLinks } from "@/components/LegalLinks";
import { cleanRef, DEMO_MINUTES } from "@/lib/demo";
import { helloText, waLink } from "@/lib/whatsapp";
import { DemoStart } from "./DemoStart";

export const metadata: Metadata = {
  title: "5-minute live demo · Clinic Easy AI",
  description: "Doctors: open Clinic Easy yourself for 5 minutes with demo patients. No password, no sign-up. Closes by itself.",
};

const W = {
  hi: {
    badge: `${DEMO_MINUTES} मिनट · LIVE डेमो`,
    title: "Clinic Easy ख़ुद चलाकर देखें",
    sub: "कोई पासवर्ड नहीं, कोई रजिस्ट्रेशन नहीं। एक बटन दबाइए, 5 मिनट के लिए असली ऐप खुल जाएगा, नकली (demo) मरीज़ों के साथ।",
    points: ["आज की लाइव लिस्ट: हो गए / अंदर / इंतज़ार", "टोकन, पर्ची (prescription), फीस और UPI", "दिन / हफ़्ते / महीने का हिसाब और रिपोर्ट", "5 मिनट बाद अपने आप बंद, आपका कोई डेटा नहीं लिया जाता"],
    endedTitle: "⏱ आपका 5 मिनट का डेमो पूरा हुआ",
    endedSub: "कैसा लगा? अपनी clinic के लिए चालू करवाने के लिए WhatsApp पर लिखें, या ख़ुद रजिस्टर करें।",
    wa: "WhatsApp पर बात करें",
    signup: "अपनी clinic रजिस्टर करें (मुफ़्त)",
    plans: "प्लान और कीमतें",
    again: "डेमो फिर से देखें",
    note: "डेमो में सब कुछ नकली है। असली मरीज़ की जानकारी न डालें। एक फ़ोन से दिन में 4 डेमो।",
  },
  en: {
    badge: `${DEMO_MINUTES} MIN · LIVE DEMO`,
    title: "Try Clinic Easy yourself",
    sub: "No password, no sign-up. Tap one button and the real app opens for 5 minutes, with fake (demo) patients.",
    points: ["Today's live list: done / in room / waiting", "Tokens, prescription, fees and UPI", "Day / week / month accounts and reports", "Closes by itself after 5 minutes; we take none of your data"],
    endedTitle: "⏱ Your 5-minute demo is over",
    endedSub: "Liked it? Message us on WhatsApp to set up your clinic, or register yourself.",
    wa: "Chat on WhatsApp",
    signup: "Register your clinic (free)",
    plans: "Plans and prices",
    again: "Watch the demo again",
    note: "Everything in the demo is fake. Do not enter real patient details. 4 demos per phone per day.",
  },
} as const;

export default async function DemoPage({ searchParams }: { searchParams: Promise<{ ended?: string; ref?: string }> }) {
  const lang = await getLang();
  const w = W[lang];
  const sp = await searchParams;
  const ended = sp.ended === "1";
  const ref = cleanRef(sp.ref);
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

        {ended ? (
          <section className="card mt-4 p-5 text-center" data-testid="demo-ended">
            <h1 className="text-2xl font-bold text-white">{w.endedTitle}</h1>
            <p className="mt-2 text-slate-300">{w.endedSub}</p>
            <div className="mt-5 flex flex-col gap-3">
              <Link href="/start?step=offer&ref=demo-end" className="btn bg-gradient-to-r from-amber-300 via-pink-400 to-violet-500 text-[#140a24]" data-testid="demo-offer">
                🎁 {lang === "hi" ? "मेरा प्लान और लॉन्च ऑफ़र" : "My plan and launch offer"}
              </Link>
              <a href={waLink(helloText(lang).replace("DEMO", "PRO"))} target="_blank" rel="noopener noreferrer" className="btn bg-emerald-500 text-white">
                💬 {w.wa}
              </a>
              <Link href="/signup" className="btn border border-emerald-300/40 bg-emerald-400/10 text-emerald-100">
                🩺 {w.signup}
              </Link>
              <Link href="/pricing" className="btn border border-white/15 bg-white/5 text-white">
                {w.plans} →
              </Link>
              <Link href="/webinar?ref=demo-end" className="text-sm text-violet-300 underline-offset-4 hover:underline">
                🎬 {lang === "hi" ? "7 मिनट का वेबिनार भी देखें" : "Also watch the 7-minute webinar"}
              </Link>
              <Link href="/demo" className="text-sm text-cyan-300 underline-offset-4 hover:underline">
                {w.again}
              </Link>
            </div>
          </section>
        ) : (
          <section className="mt-4 flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-300/10 px-4 py-1.5 font-brand text-xs font-bold tracking-[0.2em] text-amber-100">
              <span className="os-live-dot h-2 w-2 rounded-full bg-emerald-400" />
              {w.badge}
            </span>
            <h1 className="mt-5 text-3xl font-bold text-white md:text-4xl">
              <span className="os-gradient-text">{w.title}</span>
            </h1>
            <p className="mt-3 text-slate-300">{w.sub}</p>
            <ul className="mt-5 w-full space-y-1.5 text-left text-sm text-slate-200">
              {w.points.map((p) => (
                <li key={p}>✓ {p}</li>
              ))}
            </ul>
            <div className="mt-6 w-full">
              <DemoStart lang={lang} refTag={ref} />
            </div>
            <p className="mt-4 text-xs text-slate-400">{w.note}</p>
            <a href={waLink(helloText(lang))} target="_blank" rel="noopener noreferrer" className="mt-4 text-sm font-semibold text-emerald-300 underline-offset-4 hover:underline">
              💬 {w.wa}
            </a>
          </section>
        )}
        <LegalLinks className="mt-8 justify-center" />
      </div>
    </main>
  );
}
