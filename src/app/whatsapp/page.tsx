import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { getLang } from "@/lib/lang-server";
import { BrandMark, BrandName } from "@/components/BrandMark";
import { LangSwitch } from "@/components/LangSwitch";
import { LegalLinks } from "@/components/LegalLinks";
import { KEYWORDS, WHATSAPP_BUSINESS_NAME, WHATSAPP_CHANNEL_URL, helloText, waDisplay, waLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "WhatsApp · Clinic Easy AI",
  description: "Chat with Clinic Easy AI on WhatsApp: 5-minute live demo, plans, setup help. Scan the QR or tap to chat.",
};

const W = {
  hi: {
    title: "Clinic Easy AI, अब WhatsApp पर",
    sub: "QR स्कैन करें या बटन दबाएँ। आपका WhatsApp हमारे नंबर पर, मैसेज भरा हुआ, खुल जाएगा। बस Send दबाएँ।",
    chat: "WhatsApp पर चैट शुरू करें",
    scan: "दूसरे फ़ोन से? यह QR स्कैन करें",
    words: "ये शब्द भेजें, तुरंत जवाब मिलेगा",
    k: { demo: "5 मिनट का LIVE डेमो लिंक", plans: "सारे प्लान और कीमतें", pro: "Pro चालू करवाना / भुगतान", help: "सेटअप या तकनीकी मदद" },
    channel: "📢 Clinic Easy AI WhatsApp Channel फ़ॉलो करें",
    channelSub: "नए फ़ीचर, ऑफ़र और डॉक्टरों के लिए टिप्स",
    demo: "या अभी डेमो ख़ुद खोलें →",
    privacy: "हम सिर्फ़ उन्हीं को मैसेज करते हैं जो पहले हमें लिखते हैं। \"STOP\" लिखें, फिर कोई मैसेज नहीं आएगा।",
  },
  en: {
    title: "Clinic Easy AI, now on WhatsApp",
    sub: "Scan the QR or tap the button. Your WhatsApp opens on our number with the message filled in. Just press Send.",
    chat: "Start WhatsApp chat",
    scan: "On another phone? Scan this QR",
    words: "Send any of these words for an instant answer",
    k: { demo: "5-minute LIVE demo link", plans: "All plans and prices", pro: "Get Pro / payment", help: "Setup or technical help" },
    channel: "📢 Follow the Clinic Easy AI WhatsApp Channel",
    channelSub: "New features, offers and tips for doctors",
    demo: "Or open the demo yourself now →",
    privacy: "We only message people who wrote to us first. Send \"STOP\" and we will never message again.",
  },
} as const;

export default async function WhatsAppPage() {
  const lang = await getLang();
  const w = W[lang];
  const chat = waLink(helloText(lang));
  const svg = await QRCode.toString(chat, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#020617", light: "#ffffff" } });
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

        <section className="mt-2 flex flex-col items-center text-center">
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold tracking-widest text-emerald-200 ring-1 ring-emerald-400/40">
            {WHATSAPP_BUSINESS_NAME} · {waDisplay()}
          </span>
          <h1 className="mt-4 text-3xl font-bold text-white">{w.title}</h1>
          <p className="mt-2 text-slate-300">{w.sub}</p>
          <a href={chat} target="_blank" rel="noopener noreferrer" className="btn mt-5 w-full bg-emerald-500 text-lg text-white hover:bg-emerald-400" data-testid="wa-chat">
            💬 {w.chat}
          </a>
          <Link href="/demo?ref=wa-page" className="mt-3 text-sm font-semibold text-cyan-300 underline-offset-4 hover:underline">
            {w.demo}
          </Link>

          <div className="card mt-6 w-full p-4">
            <p className="text-sm text-slate-300">{w.scan}</p>
            <div className="mx-auto mt-3 w-52 rounded-2xl bg-white p-3" dangerouslySetInnerHTML={{ __html: svg }} aria-label="WhatsApp QR" />
          </div>

          <div className="card mt-4 w-full p-4 text-left">
            <h2 className="mb-2 font-bold text-white">{w.words}</h2>
            <ul className="flex flex-col gap-2">
              {(Object.keys(KEYWORDS) as (keyof typeof KEYWORDS)[]).map((k) => (
                <li key={k}>
                  <a href={waLink(KEYWORDS[k])} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10 hover:bg-white/10">
                    <span className="font-mono font-bold text-emerald-300">{KEYWORDS[k]}</span>
                    <span className="text-sm text-slate-300">{w.k[k]}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {WHATSAPP_CHANNEL_URL && (
            <a href={WHATSAPP_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="card mt-4 block w-full p-4 text-left hover:bg-white/10" data-testid="wa-channel">
              <div className="font-bold text-white">{w.channel}</div>
              <div className="text-sm text-slate-400">{w.channelSub}</div>
            </a>
          )}
          <p className="mt-5 text-xs text-slate-400">{w.privacy}</p>
        </section>
        <LegalLinks className="mt-8 justify-center" />
      </div>
    </main>
  );
}
