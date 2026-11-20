import Link from "next/link";
import { getLang } from "@/lib/lang-server";
import { getHealthWords } from "@/lib/health/words";
import { SPECIALTIES } from "@/lib/health/specialties";

// Public hub for common people: find a doctor + plan my day.
export default async function HealthHome() {
  const lang = await getLang();
  const w = getHealthWords(lang);
  return (
    <main>
      <section className="py-6 text-center">
        <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl">
          <span className="landing-gradient-text">{w.hubTitle}</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lg text-slate-300">{w.hubSub}</p>
      </section>

      <form action="/health/doctors" className="rounded-3xl border border-cyan-400/25 bg-white/5 p-4 backdrop-blur">
        <label htmlFor="hq" className="mb-2 block text-base font-semibold text-cyan-100">
          🔎 {w.findSub}
        </label>
        <div className="flex gap-2">
          <input id="hq" name="q" className="health-input flex-1" placeholder={w.problemPh} maxLength={80} />
          <button className="health-btn">{w.search}</button>
        </div>
      </form>

      <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
        {SPECIALTIES.slice(0, 8).map((s) => (
          <Link
            key={s.id}
            href={`/health/doctors?sp=${s.id}`}
            className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-2 text-center text-xs text-slate-200 hover:border-cyan-400/50"
          >
            <span className="text-2xl" aria-hidden>
              {s.emoji}
            </span>
            <span className="line-clamp-2">{(lang === "hi" ? s.hi : s.en).split(" (")[0]}</span>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Link href="/health/doctors" className="health-card block hover:border-cyan-400/60">
          <p className="text-3xl" aria-hidden>
            🩺
          </p>
          <h2 className="mt-2 text-xl font-bold text-white">{w.navDoctors}</h2>
          <p className="mt-1 text-slate-300">{w.hubDoctorsBody}</p>
        </Link>
        <Link href="/health/routine" className="health-card block hover:border-violet-400/60">
          <p className="text-3xl" aria-hidden>
            🗓️
          </p>
          <h2 className="mt-2 text-xl font-bold text-white">{w.navRoutine}</h2>
          <p className="mt-1 text-slate-300">{w.hubRoutineBody}</p>
        </Link>
      </div>

      <p className="mt-6 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-center text-sm text-emerald-100">📲 {w.installTip}</p>
    </main>
  );
}
