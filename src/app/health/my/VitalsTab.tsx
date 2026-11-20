"use client";
import { useState } from "react";
import { LEVEL_WORDS, VITALS, formatVital, newId, series, validVital, vitalLevel, type VitalType } from "@/lib/health/pro-data";
import { LEVEL_STYLE } from "./TodayTab";
import type { TabProps } from "./ProApp";

function Trend({ points, two }: { points: { v1: number; v2?: number }[]; two?: boolean }) {
  if (points.length < 2) return null;
  const vals = points.flatMap((p) => (two && p.v2 !== undefined ? [p.v1, p.v2] : [p.v1]));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i: number) => (i / (points.length - 1)) * 300;
  const y = (v: number) => 70 - ((v - min) / span) * 60;
  const line = (get: (p: { v1: number; v2?: number }) => number) => points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(get(p)).toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 300 80" className="mt-2 h-20 w-full" aria-hidden>
      <path d={line((p) => p.v1)} fill="none" stroke="#22b8f5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {two && <path d={line((p) => p.v2 ?? p.v1)} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.v1)} r="3" fill="#22b8f5" />
      ))}
    </svg>
  );
}

export function VitalsTab({ data, update, w, lang }: TabProps) {
  const [type, setType] = useState<VitalType>("bp");
  const [v1, setV1] = useState("");
  const [v2, setV2] = useState("");
  const [err, setErr] = useState(false);
  const [lastLevel, setLastLevel] = useState<ReturnType<typeof vitalLevel> | null>(null);
  const spec = VITALS[type];
  const pts = series(data.vitals, data.activeId, type, 14);
  const history = [...pts].reverse();
  const label = (t: VitalType) => (lang === "hi" ? VITALS[t].hi : VITALS[t].en);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const a = Number(v1);
    const b = spec.two ? Number(v2) : undefined;
    if (!validVital(type, a, b)) return setErr(true);
    setErr(false);
    update((d) => ({ ...d, vitals: [...d.vitals, { id: newId(), profileId: d.activeId, type, v1: a, v2: b, at: new Date().toISOString() }].slice(-2000) }));
    setLastLevel(vitalLevel(type, a, b));
    setV1("");
    setV2("");
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(VITALS) as VitalType[]).map((t) => (
          <button key={t} type="button" className={`health-chip ${t === type ? "health-chip-on" : ""}`} onClick={() => (setType(t), setLastLevel(null))}>
            {label(t)}
          </button>
        ))}
      </div>

      <form onSubmit={add} className="health-card grid gap-2">
        <p className="font-bold text-white">
          ➕ {w.addReading}: {label(type)} <span className="text-xs font-normal text-slate-400">({spec.unit})</span>
        </p>
        <div className="flex gap-2">
          <input
            className="health-input"
            inputMode="decimal"
            placeholder={spec.two ? w.upper : w.value}
            value={v1}
            onChange={(e) => setV1(e.target.value)}
            required
            data-testid="vital-v1"
          />
          {spec.two && (
            <input className="health-input" inputMode="decimal" placeholder={w.lower} value={v2} onChange={(e) => setV2(e.target.value)} required data-testid="vital-v2" />
          )}
          <button className="health-btn" data-testid="vital-add">
            {w.addBtn}
          </button>
        </div>
        {err && <p className="text-sm text-red-300">{w.invalid}</p>}
        {lastLevel && lastLevel !== "ok" && (
          <div className={`rounded-2xl p-3 ${lastLevel === "urgent" ? "bg-red-500/20" : "bg-amber-500/10"}`} role="alert" data-testid="vital-alert">
            <p className={LEVEL_STYLE[lastLevel]}>{lang === "hi" ? LEVEL_WORDS[lastLevel].hi : LEVEL_WORDS[lastLevel].en}</p>
            {lastLevel === "urgent" && (
              <a href="tel:108" className="mt-2 inline-block rounded-xl bg-red-600 px-4 py-2 font-bold text-white">
                📞 108
              </a>
            )}
          </div>
        )}
      </form>

      <section className="health-card">
        <p className="font-bold text-white">📈 {w.history}</p>
        <Trend points={pts} two={spec.two} />
        {history.length === 0 ? (
          <p className="mt-1 text-sm text-slate-400">{w.noReadings}</p>
        ) : (
          <ul className="mt-2 divide-y divide-white/5">
            {history.map((v) => {
              const lvl = vitalLevel(v.type, v.v1, v.v2);
              return (
                <li key={v.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="text-slate-400">{new Date(v.at).toLocaleString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="font-bold text-white">
                    {formatVital(v)} <span className="text-xs font-normal text-slate-500">{spec.unit}</span>
                  </span>
                  <span className={`text-xs ${LEVEL_STYLE[lvl]}`}>{lang === "hi" ? LEVEL_WORDS[lvl].hi : LEVEL_WORDS[lvl].en}</span>
                  <button
                    type="button"
                    className="text-slate-500"
                    aria-label={w.delete}
                    onClick={() => update((d) => ({ ...d, vitals: d.vitals.filter((x) => x.id !== v.id) }))}
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <p className="text-xs text-slate-500">ℹ️ {w.rangeNote}</p>
    </div>
  );
}
