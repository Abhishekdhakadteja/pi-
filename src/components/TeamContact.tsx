import type { Lang } from "@/lib/i18n";
import { HUB, getTeam, type TeamMember } from "@/lib/contact";

const WORDS = {
  hi: {
    badge: "हमसे संपर्क करें",
    title: "Clinic Easy टीम से सीधे बात करें",
    sub: "प्लान, डेमो या सेटअप के लिए Sales से, और ऐप में किसी दिक्कत के लिए Technical से।",
    founder: "फाउंडर",
    sales: "सेल्स",
    tech: "टेक्निकल सपोर्ट",
    call: "कॉल",
    wa: "WhatsApp",
    mail: "Email",
    soon: "नंबर जल्द यहाँ दिखेंगे।",
  },
  en: {
    badge: "CONTACT US",
    title: "Talk directly to the Clinic Easy team",
    sub: "Sales for plans, demos and setup. Technical for any problem in the app.",
    founder: "Founder",
    sales: "Sales",
    tech: "Technical Support",
    call: "Call",
    wa: "WhatsApp",
    mail: "Email",
    soon: "Numbers will appear here soon.",
  },
};

const ICON = {
  call: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z",
  wa: "M7.9 20A9 9 0 1 0 4.1 16.1L2 22z",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6",
  pin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
};

function I({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const BTN =
  "inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 text-base font-semibold text-white transition hover:bg-white/10";

function Person({ p, w }: { p: TeamMember; w: (typeof WORDS)["hi"] }) {
  return (
    <div className="glass flex flex-col gap-4 p-5 text-left">
      <div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${
            p.role === "sales" ? "bg-cyan-400/10 text-cyan-200 ring-cyan-400/30" : "bg-violet-400/10 text-violet-200 ring-violet-400/30"
          }`}
        >
          {w.founder} · {p.role === "sales" ? w.sales : w.tech}
        </span>
        {p.name && <p className="mt-3 text-xl font-bold text-white">{p.name}</p>}
        {p.display && <p className="mt-1 text-base text-slate-300">{p.display}</p>}
        {p.email && <p className="mt-0.5 break-all text-sm text-slate-400">{p.email}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {p.tel && (
          <a href={p.tel} className={BTN}>
            <span className="text-cyan-300"><I d={ICON.call} /></span>
            {w.call}
          </a>
        )}
        {p.whatsapp && (
          <a href={p.whatsapp} target="_blank" rel="noopener noreferrer" className={BTN}>
            <span className="text-emerald-400"><I d={ICON.wa} /></span>
            {w.wa}
          </a>
        )}
        {p.email && (
          <a href={`mailto:${p.email}`} className={BTN}>
            <span className="text-violet-300"><I d={ICON.mail} /></span>
            {w.mail}
          </a>
        )}
      </div>
    </div>
  );
}

/** Hub line with a pin, for footers. */
export function HubLine({ lang }: { lang: Lang }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <I d={ICON.pin} className="h-4 w-4 text-cyan-300" />
      {HUB[lang]}
    </span>
  );
}

/**
 * Two founder cards (Sales, Technical support) with Call, WhatsApp and Email, plus the main hub.
 * For dark pages (home, pricing, /contact). A founder without phone and email is not shown.
 */
export function TeamContact({ lang, heading = true }: { lang: Lang; heading?: boolean }) {
  const w = WORDS[lang];
  const team = getTeam();
  return (
    <div className="glass relative overflow-hidden px-5 py-8 text-center md:px-8">
      <div className="pointer-events-none absolute -bottom-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" aria-hidden />
      {heading && (
        <div className="relative">
          <span
            className={`inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1 text-xs font-bold text-emerald-300 ${lang === "en" ? "tracking-[0.15em]" : ""}`}
          >
            <span className="landing-dot h-2 w-2 rounded-full bg-emerald-400" />
            {w.badge}
          </span>
          <h2 className="mt-4 text-2xl font-bold text-white md:text-3xl">{w.title}</h2>
          <p className="mx-auto mt-2 max-w-xl text-base text-slate-400">{w.sub}</p>
        </div>
      )}
      {team.length > 0 ? (
        <div className={`relative mt-6 grid gap-4 ${team.length > 1 ? "md:grid-cols-2" : "mx-auto max-w-md"}`}>
          {team.map((p) => (
            <Person key={p.role} p={p} w={w} />
          ))}
        </div>
      ) : (
        <p className="relative mt-6 text-base text-slate-400">{w.soon}</p>
      )}
      <p className="relative mt-6 flex justify-center text-sm text-slate-300">
        <HubLine lang={lang} />
      </p>
    </div>
  );
}
