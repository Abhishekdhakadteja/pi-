import Link from "next/link";
import type { Staff } from "@/lib/staff";
import type { Lang } from "@/lib/i18n";
import { loadDay } from "@/lib/command-center";
import { buildInsights } from "@/lib/ai-brief";
import { getOsWords } from "@/lib/os-content";
import { rupees } from "@/lib/money";
import { getPlanState } from "@/lib/subscription";
import { aiAllowed } from "@/lib/plans";
import { getProWords } from "@/lib/pro-content";

const TONE = {
  info: "border-cyan-400/25 bg-cyan-400/[0.06] text-cyan-50",
  warn: "border-amber-400/30 bg-amber-400/[0.07] text-amber-50",
  ok: "border-emerald-400/30 bg-emerald-400/[0.07] text-emerald-50",
} as const;
const DOT = { info: "bg-cyan-300", warn: "bg-amber-300", ok: "bg-emerald-300" } as const;

/**
 * The AI brief: live numbers for today plus what the agents noticed, each with a link to act.
 * `compact` is the strip shown on top of the role home screens.
 */
export async function AiBrief({ staff, lang, compact = false, hideStats = false }: { staff: Staff; lang: Lang; compact?: boolean; hideStats?: boolean }) {
  const w = getOsWords(lang);
  const [d, plan] = await Promise.all([loadDay(staff), getPlanState(staff.clinic_id)]);
  // Basic shows today's plain numbers only; what the AI noticed (and what to do) is Pro.
  const ai = aiAllowed(plan);
  const canMoney = staff.role !== "attender";
  const insights = buildInsights(d, w, canMoney);
  const total = d.statuses.length;
  const waiting = d.statuses.filter((s) => s === "waiting" || s === "booked").length;
  const done = d.statuses.filter((s) => s === "done").length;
  const stats = [
    { k: w.patientsToday, v: String(total), c: "text-white" },
    { k: w.waitingNow, v: String(waiting), c: "text-amber-300" },
    { k: w.doneToday, v: String(done), c: "text-emerald-300" },
    ...(canMoney ? [{ k: w.collectionToday, v: rupees(d.collection), c: "os-gradient-text" }] : []),
  ];
  const shown = compact ? insights.slice(0, 2) : insights;

  return (
    <section className="card os-scan relative mb-4 overflow-hidden p-4" data-testid="ai-brief">
      <div className="os-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-brand text-xs font-bold tracking-[0.22em] text-cyan-200">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z" />
            </svg>
            {w.briefTitle.toUpperCase()}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-emerald-300">
            <span className="os-live-dot h-2 w-2 rounded-full bg-emerald-400" />
            {w.systemsOk}
          </span>
        </div>

        {!hideStats && (
        <div className={`mt-3 grid gap-2 ${canMoney ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
          {stats.map((s) => (
            <div key={s.k} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <div className={`text-2xl font-black leading-tight ${s.c}`}>{s.v}</div>
              <div className="text-xs text-slate-400">{s.k}</div>
            </div>
          ))}
        </div>
        )}

        {!ai && (
          <Link
            href="/pro"
            className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-300/30 bg-amber-300/[0.07] px-3 py-2.5 text-[15px] leading-snug text-amber-50"
            data-testid="ai-brief-locked"
          >
            <span>🔒 {getProWords(lang).briefLocked}</span>
            <span className="shrink-0 font-bold text-amber-200">Pro →</span>
          </Link>
        )}
        {ai && (<>
        <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{w.insightsTitle}</div>
        <ul className="mt-1.5 flex flex-col gap-2" data-testid="ai-insights">
          {shown.map((i, n) => {
            const body = (
              <>
                <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${DOT[i.tone]}`} />
                <span className="flex-1">{i.text}</span>
                {i.href && <span className="shrink-0 text-cyan-300">→</span>}
              </>
            );
            return (
              <li key={n}>
                {i.href ? (
                  <Link href={i.href} className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 text-[15px] leading-snug ${TONE[i.tone]}`}>
                    {body}
                  </Link>
                ) : (
                  <div className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 text-[15px] leading-snug ${TONE[i.tone]}`}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
        </>)}
        {compact && (
          <Link href="/ai" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-cyan-300">
            {w.openCenter} →
          </Link>
        )}
      </div>
    </section>
  );
}
