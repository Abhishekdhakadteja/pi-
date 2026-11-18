import type { Lang } from "@/lib/i18n";
import { getSupportContact } from "@/lib/contact";

const WORDS = {
  hi: { badge: "24×7 सहायता", title: "Clinic Easy टीम से बात करें", sub: "सेटअप, ट्रेनिंग या कोई भी सवाल, हम तुरंत मदद करेंगे।", call: "कॉल करें", wa: "WhatsApp", mail: "Email" },
  en: { badge: "24×7 SUPPORT", title: "Talk to the Clinic Easy team", sub: "Setup, training or any question, we help right away.", call: "Call", wa: "WhatsApp", mail: "Email" },
};

const ICON = {
  call: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z",
  wa: "M7.9 20A9 9 0 1 0 4.1 16.1L2 22z",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6",
};

function I({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/**
 * Support box with Call, WhatsApp and Email.
 * "card": big glowing box (front page). "compact": one line of buttons (login page, inside the app).
 * tone "dark" for dark backgrounds, "light" for the white app pages. Renders nothing until a phone or email is set.
 */
export function SupportContact({ lang, variant = "card", tone = "dark" }: { lang: Lang; variant?: "card" | "compact"; tone?: "dark" | "light" }) {
  const c = getSupportContact();
  if (!c) return null;
  const w = WORDS[lang];
  const dark = tone === "dark";
  const btn = dark
    ? "inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-base font-semibold text-white backdrop-blur transition hover:bg-white/10"
    : "inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50";

  const buttons = (
    <div className={`flex flex-wrap gap-2 ${variant === "card" ? "justify-center" : "justify-center"}`}>
      {c.tel && (
        <a href={c.tel} className={btn}>
          <span className={dark ? "text-cyan-300" : "text-teal-700"}>
            <I d={ICON.call} />
          </span>
          {variant === "card" ? c.display : w.call}
        </a>
      )}
      {c.whatsapp && (
        <a href={c.whatsapp} target="_blank" rel="noopener noreferrer" className={btn}>
          <span className="text-emerald-400">
            <I d={ICON.wa} />
          </span>
          {w.wa}
        </a>
      )}
      {c.email && (
        <a href={`mailto:${c.email}`} className={`${btn} max-w-full`}>
          <span className={dark ? "text-violet-300" : "text-violet-600"}>
            <I d={ICON.mail} />
          </span>
          <span className="truncate">{variant === "card" ? c.email : w.mail}</span>
        </a>
      )}
    </div>
  );

  const badge = (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold ${lang === "en" ? "tracking-[0.15em]" : ""} ${
        dark ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      }`}
    >
      <span className="landing-dot h-2 w-2 rounded-full bg-emerald-400" />
      {w.badge}
    </span>
  );

  if (variant === "compact") {
    return (
      <div className={`flex flex-col items-center gap-3 rounded-2xl p-4 ${dark ? "glass" : "card"}`}>
        {badge}
        {buttons}
      </div>
    );
  }

  return (
    <div className="glass relative overflow-hidden px-6 py-9 text-center">
      <div className="pointer-events-none absolute -bottom-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl" aria-hidden />
      <div className="relative">{badge}</div>
      <h2 className="relative mt-4 text-2xl font-bold text-white md:text-3xl">{w.title}</h2>
      <p className="relative mt-2 text-base text-slate-400">{w.sub}</p>
      <div className="relative mt-6">{buttons}</div>
    </div>
  );
}
