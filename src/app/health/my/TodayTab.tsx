"use client";
import { LEVEL_WORDS, VITALS, adherence, daysLeft, formatVital, isActiveOn, medAlert, takenKey, vitalLevel, type VitalType } from "@/lib/health/pro-data";
import type { TabProps } from "./ProApp";

export const LEVEL_STYLE = {
  ok: "text-emerald-300",
  watch: "text-amber-300",
  doctor: "text-orange-300",
  urgent: "text-red-300 font-bold",
} as const;

export function TodayTab({ data, update, w, lang, today, goTo }: TabProps & { goTo: (t: "meds" | "vitals" | "visits") => void }) {
  const pid = data.activeId;
  const meds = data.meds.filter((m) => m.profileId === pid);
  const todays = meds
    .filter((m) => isActiveOn(m, today))
    .flatMap((m) => m.times.map((t) => ({ med: m, time: t })))
    .sort((a, b) => a.time.localeCompare(b.time));
  const alerts = meds.map((m) => ({ m, a: medAlert(m, data.taken, today) })).filter((x) => x.a);
  const adh = adherence(meds, data.taken, today);
  const next = data.visits
    .filter((v) => v.profileId === pid && v.date >= today)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  const latest = (Object.keys(VITALS) as VitalType[])
    .map((t) => data.vitals.filter((v) => v.profileId === pid && v.type === t).sort((a, b) => b.at.localeCompare(a.at))[0])
    .filter(Boolean);

  return (
    <div className="grid gap-4">
      {alerts.length > 0 && (
        <section className="rounded-3xl border border-amber-400/40 bg-amber-500/10 p-4" data-testid="med-alerts">
          <p className="font-bold text-amber-100">⚠️ {w.alerts}</p>
          <ul className="mt-1 grid gap-1 text-sm text-amber-50">
            {alerts.map(({ m, a }) => (
              <li key={m.id}>
                💊 <b>{m.name}</b>: {a === "refill" ? `${w.refill} (${daysLeft(m, data.taken)} ${w.daysLeftWord})` : a === "out" ? w.out : w.courseEnding}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="health-card">
        <div className="flex items-center justify-between">
          <p className="font-bold text-white">💊 {w.dosesToday}</p>
          {adh !== null && (
            <p className="text-xs text-slate-300">
              {w.adherence}: <b className={adh >= 80 ? "text-emerald-300" : "text-amber-300"}>{adh}%</b>
            </p>
          )}
        </div>
        {todays.length === 0 ? (
          <button type="button" className="mt-2 text-left text-sm text-slate-400 underline" onClick={() => goTo("meds")}>
            {w.noDoses}
          </button>
        ) : (
          <ul className="mt-2 grid gap-2">
            {todays.map(({ med, time }) => {
              const k = takenKey(med.id, today, time);
              const done = !!data.taken[k];
              return (
                <li key={k}>
                  <label className={`flex items-center gap-3 rounded-2xl border p-3 ${done ? "border-emerald-400/40 bg-emerald-500/10" : "border-white/10"}`}>
                    <input
                      type="checkbox"
                      className="h-6 w-6"
                      checked={done}
                      onChange={() => update((d) => ({ ...d, taken: { ...d.taken, [k]: !done } }))}
                      data-testid="dose-check"
                    />
                    <span className="w-12 font-bold tabular-nums text-white">{time}</span>
                    <span className="flex-1">
                      <span className={`font-semibold ${done ? "text-emerald-200 line-through" : "text-white"}`}>{med.name}</span>
                      {med.dose && <span className="block text-xs text-slate-400">{med.dose}</span>}
                    </span>
                    {done && <span className="text-xs text-emerald-300">✓ {w.taken}</span>}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {next && (
        <button type="button" className="health-card text-left" onClick={() => goTo("visits")}>
          <p className="font-bold text-white">🩺 {w.nextVisit}</p>
          <p className="mt-1 text-slate-200">
            {next.date} {next.time} · {next.doctor}
          </p>
          {next.note && <p className="text-sm text-slate-400">{next.note}</p>}
        </button>
      )}

      <button type="button" className="health-card text-left" onClick={() => goTo("vitals")}>
        <p className="font-bold text-white">📈 {w.lastReadings}</p>
        {latest.length === 0 ? (
          <p className="mt-1 text-sm text-slate-400">{w.noReadings}</p>
        ) : (
          <ul className="mt-2 grid grid-cols-2 gap-2">
            {latest.map((v) => {
              const lvl = vitalLevel(v.type, v.v1, v.v2);
              return (
                <li key={v.id} className="rounded-2xl border border-white/10 p-2">
                  <p className="text-xs text-slate-400">{lang === "hi" ? VITALS[v.type].hi : VITALS[v.type].en}</p>
                  <p className="text-lg font-bold text-white">
                    {formatVital(v)} <span className="text-xs font-normal text-slate-400">{VITALS[v.type].unit}</span>
                  </p>
                  <p className={`text-xs ${LEVEL_STYLE[lvl]}`}>{lang === "hi" ? LEVEL_WORDS[lvl].hi : LEVEL_WORDS[lvl].en}</p>
                </li>
              );
            })}
          </ul>
        )}
      </button>

      <p className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-3 text-center text-sm text-violet-100">✨ {w.aiSoon}</p>
    </div>
  );
}
