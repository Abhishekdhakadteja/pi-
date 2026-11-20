"use client";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/components/LangProvider";
import { getHealthWords } from "@/lib/health/words";
import { GOALS, buildRoutine, routineToIcs, type GoalId, type Kind, type MedSlot, type Medicine, type RoutineInput } from "@/lib/health/routine";

const KEY = "ce-routine-v1";
const KIND_STYLE: Record<Kind, string> = {
  body: "border-emerald-400/40 text-emerald-200",
  food: "border-amber-400/40 text-amber-200",
  med: "border-rose-400/50 text-rose-200",
  mind: "border-violet-400/40 text-violet-200",
  work: "border-sky-400/40 text-sky-200",
  water: "border-cyan-400/40 text-cyan-200",
  sleep: "border-indigo-400/40 text-indigo-200",
};
const KIND_EMOJI: Record<Kind, string> = { body: "🏃", food: "🍽️", med: "💊", mind: "🧘", work: "💼", water: "💧", sleep: "🌙" };

const DEFAULT: RoutineInput = { wake: "06:00", sleep: "22:00", work: null, goals: [], diet: "veg", medicines: [] };

function load(): { input: RoutineInput; made: boolean } | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { input: RoutineInput; made: boolean };
    return v && v.input && Array.isArray(v.input.goals) ? v : null;
  } catch {
    return null;
  }
}

export function RoutinePlanner() {
  const { lang } = useT();
  const w = getHealthWords(lang);
  const [input, setInput] = useState<RoutineInput>(DEFAULT);
  const [made, setMade] = useState(false);
  const [err, setErr] = useState(false);
  const [aiNote, setAiNote] = useState(false);

  useEffect(() => {
    const saved = load();
    if (saved) {
      setInput({ ...DEFAULT, ...saved.input });
      setMade(saved.made);
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ input, made }));
    } catch {
      // private mode: the plan still works, it just isn't remembered
    }
  }, [input, made]);

  const plan = useMemo(() => (made ? buildRoutine(input, lang) : []), [made, input, lang]);
  const set = (p: Partial<RoutineInput>) => setInput((i) => ({ ...i, ...p }));
  const toggleGoal = (g: GoalId) => set({ goals: input.goals.includes(g) ? input.goals.filter((x) => x !== g) : [...input.goals, g] });
  const setMed = (i: number, m: Medicine) => set({ medicines: input.medicines.map((x, j) => (j === i ? m : x)) });

  function downloadIcs() {
    const blob = new Blob([routineToIcs(plan, new Date())], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mera-din-clinic-easy.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  const shareText = `${w.yourDay} (Clinic Easy)\n` + plan.map((p) => `${p.time} ${p.title}`).join("\n");

  if (made) {
    return (
      <main data-testid="routine-plan">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-white">🗓️ {w.yourDay}</h1>
          <button type="button" className="health-btn-ghost" onClick={() => setMade(false)}>
            ✏️ {w.edit}
          </button>
        </div>
        <ol className="mt-4 grid gap-2">
          {plan.map((p, i) => (
            <li key={i} className={`flex gap-3 rounded-2xl border bg-white/5 p-3 ${KIND_STYLE[p.kind]}`}>
              <span className="w-14 shrink-0 font-brand text-base font-bold tabular-nums text-white">{p.time}</span>
              <span>
                <span className="font-semibold">
                  {KIND_EMOJI[p.kind]} {p.title}
                </span>
                {p.note && <span className="block text-sm text-slate-400">{p.note}</span>}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button type="button" className="health-btn" onClick={downloadIcs} data-testid="routine-ics">
            🔔 {w.addCalendar}
          </button>
          <a
            className="health-btn-ghost health-wa justify-center"
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            💬 {w.share}
          </a>
        </div>
        <p className="mt-2 text-xs text-slate-400">{w.calendarHelp}</p>
        <p className="mt-4 text-xs text-slate-500">
          🔒 {w.savedLocal} ℹ️ {w.healthNote}
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1 className="text-2xl font-bold text-white">🗓️ {w.routineTitle}</h1>
      <p className="mt-1 text-slate-300">{w.routineSub}</p>

      {/* mode picker: systematic (free, live) vs AI (paid, soon) */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border-2 border-cyan-400 bg-cyan-400/10 p-3">
          <p className="font-bold text-white">⚙️ {w.modeSystem}</p>
          <p className="text-xs text-cyan-100">{w.modeSystemBody}</p>
        </div>
        <button type="button" onClick={() => setAiNote(true)} className="rounded-2xl border border-violet-400/40 bg-violet-500/10 p-3 text-left">
          <p className="font-bold text-white">
            ✨ {w.modeAi}{" "}
            <span className="ml-1 rounded-full bg-violet-500/30 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-100">{w.soon}</span>
          </p>
          <p className="text-xs text-violet-100">{w.modeAiBody}</p>
        </button>
      </div>
      {aiNote && <p className="mt-2 rounded-2xl bg-violet-500/10 p-3 text-sm text-violet-100">{w.aiSoonNote}</p>}

      <form
        className="health-card mt-4 grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.goals.length) return setErr(true);
          setErr(false);
          setMade(true);
          window.scrollTo({ top: 0 });
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-semibold text-slate-300">
            ⏰ {w.wake}
            <input type="time" className="health-input mt-1" value={input.wake} onChange={(e) => set({ wake: e.target.value })} required />
          </label>
          <label className="text-sm font-semibold text-slate-300">
            🌙 {w.sleep}
            <input type="time" className="health-input mt-1" value={input.sleep} onChange={(e) => set({ sleep: e.target.value })} required />
          </label>
        </div>

        <div>
          <label className="flex items-center gap-3 text-base text-slate-200">
            <input
              type="checkbox"
              className="h-6 w-6"
              checked={!!input.work}
              onChange={(e) => set({ work: e.target.checked ? { start: "10:00", end: "18:00" } : null })}
            />
            💼 {w.hasWork}
          </label>
          {input.work && (
            <div className="mt-2 grid grid-cols-2 gap-3">
              <label className="text-sm text-slate-300">
                {w.workStart}
                <input type="time" className="health-input mt-1" value={input.work.start} onChange={(e) => set({ work: { ...input.work!, start: e.target.value } })} />
              </label>
              <label className="text-sm text-slate-300">
                {w.workEnd}
                <input type="time" className="health-input mt-1" value={input.work.end} onChange={(e) => set({ work: { ...input.work!, end: e.target.value } })} />
              </label>
            </div>
          )}
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-300">🎯 {w.goals}</legend>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <button
                key={g.id}
                type="button"
                aria-pressed={input.goals.includes(g.id)}
                className={`health-chip ${input.goals.includes(g.id) ? "health-chip-on" : ""}`}
                onClick={() => toggleGoal(g.id)}
                data-testid={`goal-${g.id}`}
              >
                {g.emoji} {lang === "hi" ? g.hi : g.en}
              </button>
            ))}
          </div>
          {err && <p className="mt-2 text-sm text-red-300">{w.pickGoal}</p>}
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-300">🍽️ {w.diet}</legend>
          <div className="flex gap-2">
            {(["veg", "nonveg"] as const).map((d) => (
              <button key={d} type="button" className={`health-chip ${input.diet === d ? "health-chip-on" : ""}`} onClick={() => set({ diet: d })}>
                {d === "veg" ? `🥗 ${w.veg}` : `🍗 ${w.nonveg}`}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-300">💊 {w.meds}</legend>
          <div className="grid gap-2">
            {input.medicines.map((m, i) => (
              <div key={i} className="rounded-2xl border border-white/10 p-2">
                <div className="flex gap-2">
                  <input
                    className="health-input"
                    placeholder={w.medName}
                    value={m.name}
                    maxLength={60}
                    onChange={(e) => setMed(i, { ...m, name: e.target.value })}
                  />
                  <button type="button" className="health-btn-ghost" onClick={() => set({ medicines: input.medicines.filter((_, j) => j !== i) })}>
                    {w.remove}
                  </button>
                </div>
                <div className="mt-2 flex gap-2">
                  {(["morning", "noon", "night"] as MedSlot[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`health-chip ${m.slots.includes(s) ? "health-chip-on" : ""}`}
                      onClick={() => setMed(i, { ...m, slots: m.slots.includes(s) ? m.slots.filter((x) => x !== s) : [...m.slots, s] })}
                    >
                      {w[s]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {input.medicines.length < 10 && (
              <button
                type="button"
                className="health-btn-ghost justify-center"
                onClick={() => set({ medicines: [...input.medicines, { name: "", slots: ["morning"] }] })}
              >
                {w.addMed}
              </button>
            )}
          </div>
        </fieldset>

        <button className="health-btn text-lg" data-testid="routine-make">
          ✨ {w.makePlan}
        </button>
        <p className="text-xs text-slate-500">ℹ️ {w.healthNote}</p>
      </form>
    </main>
  );
}
