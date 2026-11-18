import Link from "next/link";
import { getLang } from "@/lib/lang-server";
import { getLanding } from "@/lib/landing-content";
import { LangSwitch } from "@/components/LangSwitch";
import { BrandMark, BrandName } from "@/components/BrandMark";
import { LandingIcon } from "@/components/LandingIcon";
import { SupportContact } from "@/components/SupportContact";
import { ProBadge } from "@/components/ProBadge";

// Public front page: the first thing a doctor sees. Dark, "AI clinic OS" look.
// Pure server HTML + CSS animations (no client JS) so it stays fast on cheap phones.
export default async function Home() {
  const lang = await getLang();
  const c = getLanding(lang);

  return (
    <main className="landing relative min-h-screen overflow-hidden bg-[#030712] text-slate-200">
      {/* background: glow orbs + faint grid */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="landing-grid absolute inset-0 opacity-40" />
        <div className="absolute -left-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -right-40 top-40 h-[26rem] w-[26rem] rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-5">
        {/* top bar */}
        <header className="flex items-center justify-between py-5">
          <span className="flex items-center gap-2.5 text-lg text-white">
            <BrandMark size={38} />
            <BrandName />
          </span>
          <span className="flex items-center gap-2">
            <Link href="/pricing" aria-label="Clinic Easy Pro" data-testid="landing-pro">
              <ProBadge size="md" />
            </Link>
            <span className="[&_button]:border [&_button]:border-white/20 [&_button]:bg-white/5 [&_button]:text-white [&_button]:backdrop-blur">
              <LangSwitch />
            </span>
          </span>
        </header>

        {/* hero */}
        <section className="flex flex-col items-center pb-14 pt-8 text-center md:pt-14">
          <div className="landing-orb relative">
            <BrandMark size={112} />
          </div>

          <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 font-brand text-xs font-bold tracking-[0.25em] text-cyan-200">
            <span className="landing-dot h-2 w-2 rounded-full bg-emerald-400" />
            {c.badge}
          </span>

          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight text-white md:text-6xl">
            {c.headlineA}
            <br />
            <span className="landing-gradient-text">{c.headlineB}</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300 md:text-xl">{c.sub}</p>

          {/* heartbeat line */}
          <svg viewBox="0 0 600 60" className="mt-8 h-12 w-full max-w-lg" aria-hidden>
            <defs>
              <linearGradient id="landing-ecg" x1="0" x2="1">
                <stop offset="0" stopColor="#22F5D0" stopOpacity="0" />
                <stop offset=".3" stopColor="#22F5D0" />
                <stop offset=".7" stopColor="#22B8F5" />
                <stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              className="landing-ecg"
              d="M0 32h180l14-22 18 46 20-52 16 40 10-12h342"
              fill="none"
              stroke="url(#landing-ecg)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:max-w-lg">
            <Link
              href="/login"
              className="btn bg-gradient-to-r from-[#14d8b8] via-[#22B8F5] to-[#7c5cf6] text-[#020617] shadow-[0_0_40px_-8px_rgba(34,184,245,0.7)] hover:brightness-110"
            >
              {c.ctaLogin} →
            </Link>
            <a href="#day" className="btn border border-white/15 bg-white/5 text-white backdrop-blur hover:bg-white/10">
              {c.ctaDay}
            </a>
          </div>
          <Link href="/pricing" className="mt-4 text-sm font-semibold text-amber-200 underline decoration-amber-300/50 underline-offset-4 hover:text-amber-100">
            {lang === "hi" ? "✦ Clinic Easy Pro: लॉन्च ऑफ़र, 90% तक छूट →" : "✦ Clinic Easy Pro: launch offer, up to 90% off →"}
          </Link>

          <ul className="mt-8 flex flex-wrap justify-center gap-2">
            {c.pills.map((p) => (
              <li key={p} className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm text-slate-300">
                {p}
              </li>
            ))}
          </ul>
        </section>

        {/* a doctor's day with AI */}
        <section id="day" className="scroll-mt-6 py-12">
          <SectionTitle title={c.dayTitle} sub={c.daySub} />
          <ol className="relative mt-10 space-y-4 border-l border-cyan-400/20 pl-6 md:mx-auto md:max-w-3xl">
            {c.day.map((s) => (
              <li key={s.title} className="relative">
                <span className="absolute -left-[34px] top-5 flex h-4 w-4 items-center justify-center rounded-full border border-cyan-300/60 bg-[#030712]">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                </span>
                <div className="glass p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold tracking-wide text-cyan-300">{s.time}</span>
                    <StatusBadge status={s.status} live={c.live} soon={c.soon} />
                  </div>
                  <div className="mt-3 flex gap-4">
                    <IconBox name={s.icon} />
                    <div>
                      <h3 className="text-xl font-semibold text-white">{s.title}</h3>
                      <p className="mt-1 text-base leading-relaxed text-slate-400">{s.body}</p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* features */}
        <section className="py-12">
          <SectionTitle title={c.featuresTitle} sub={c.featuresSub} />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.features.map((f) => (
              <div key={f.title} className={`glass p-5 ${f.status === "soon" ? "opacity-90" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <IconBox name={f.icon} />
                  <StatusBadge status={f.status} live={c.live} soon={c.soon} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-1 text-base leading-relaxed text-slate-400">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* trust */}
        <section className="py-12">
          <SectionTitle title={c.trustTitle} />
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {c.trust.map((t) => (
              <div key={t.title} className="glass flex gap-3 p-5">
                <LandingIcon name="shield" className="mt-0.5 h-6 w-6 shrink-0 text-emerald-300" />
                <div>
                  <h3 className="font-semibold text-white">{t.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">{t.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* final call to action */}
        <section className="py-14">
          <div className="glass relative overflow-hidden px-6 py-10 text-center">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" aria-hidden />
            <h2 className="relative text-3xl font-bold text-white md:text-4xl">{c.finalTitle}</h2>
            <p className="relative mt-3 text-lg text-slate-300">{c.finalSub}</p>
            <Link
              href="/login"
              className="btn relative mx-auto mt-7 max-w-sm bg-gradient-to-r from-[#14d8b8] via-[#22B8F5] to-[#7c5cf6] text-[#020617] shadow-[0_0_40px_-8px_rgba(34,184,245,0.7)] hover:brightness-110"
            >
              {c.ctaLogin} →
            </Link>
          </div>
        </section>

        {/* support contact */}
        <section className="pb-14">
          <SupportContact lang={lang} />
        </section>

        <footer className="flex items-center justify-center gap-2 border-t border-white/10 py-8 text-sm text-slate-500">
          <BrandMark size={20} />
          {c.footer}
        </footer>
      </div>
    </main>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold text-white md:text-4xl">{title}</h2>
      {sub && <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-400">{sub}</p>}
    </div>
  );
}

function IconBox({ name }: { name: Parameters<typeof LandingIcon>[0]["name"] }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-gradient-to-br from-cyan-400/15 to-violet-500/15 text-cyan-200">
      <LandingIcon name={name} />
    </span>
  );
}

function StatusBadge({ status, live, soon }: { status: "live" | "soon"; live: string; soon: string }) {
  return status === "live" ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      {live}
    </span>
  ) : (
    <span className="rounded-full bg-violet-400/10 px-2.5 py-1 text-xs font-semibold text-violet-300 ring-1 ring-violet-400/30">{soon}</span>
  );
}
