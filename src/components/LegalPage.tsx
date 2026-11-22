import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { getLegal, GRIEVANCE_TITLE, LEGAL_UPDATED } from "@/lib/legal-content";
import { LegalLinks } from "@/components/LegalLinks";
import { getTeam } from "@/lib/contact";
import { BrandMark, BrandName } from "@/components/BrandMark";
import { LangSwitch } from "@/components/LangSwitch";

// One page layout for /privacy and /terms: plain server HTML, readable on a cheap phone.
export function LegalPage({ kind, lang }: { kind: "privacy" | "terms"; lang: Lang }) {
  const doc = getLegal(kind, lang);
  const officer = getTeam().find((m) => m.role === "tech") ?? getTeam()[0];
  return (
    <main className="os min-h-screen">
      <div className="mx-auto max-w-3xl px-4 pb-16">
        <header className="flex items-center justify-between py-5">
          <Link href="/" className="flex items-center gap-2.5 text-lg text-white">
            <BrandMark size={34} />
            <BrandName />
          </Link>
          <span className="[&_button]:border [&_button]:border-white/20 [&_button]:bg-white/5 [&_button]:text-white">
            <LangSwitch />
          </span>
        </header>
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-slate-200 md:p-8" data-testid={`legal-${kind}`}>
          <h1 className="text-2xl font-bold text-white md:text-3xl">{doc.title}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {doc.updatedLabel}: {new Date(LEGAL_UPDATED + "T00:00:00Z").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
          </p>
          <p className="mt-4 leading-relaxed">{doc.intro}</p>
          {doc.sections.map((s) => (
            <section key={s.h} className="mt-6">
              <h2 className="text-lg font-bold text-cyan-200">{s.h}</h2>
              {s.p && <p className="mt-2 leading-relaxed">{s.p}</p>}
              {s.items && (
                <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-relaxed">
                  {s.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          {officer && (
            <section className="mt-8 rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-4" id="grievance">
              <h2 className="font-bold text-white">{GRIEVANCE_TITLE[lang]}</h2>
              <p className="mt-1">{officer.name}</p>
              {officer.email && (
                <p>
                  <a className="text-cyan-300 underline" href={`mailto:${officer.email}`}>{officer.email}</a>
                </p>
              )}
              {officer.whatsapp && (
                <p>
                  <a className="text-cyan-300 underline" href={officer.whatsapp} target="_blank" rel="noopener noreferrer">
                    WhatsApp {officer.display}
                  </a>
                </p>
              )}
            </section>
          )}
        </article>
        <LegalLinks className="mt-6 justify-center" />
      </div>
    </main>
  );
}
