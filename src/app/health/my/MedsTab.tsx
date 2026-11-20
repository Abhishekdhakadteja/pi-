"use client";
import { useState } from "react";
import { daysLeft, newId, stockLeft, withStock, type Med } from "@/lib/health/pro-data";
import { routineToIcs } from "@/lib/health/routine";
import type { TabProps } from "./ProApp";

const blank = (profileId: string, today: string): Med => ({
  id: "",
  profileId,
  name: "",
  dose: "",
  times: ["08:00"],
  perDose: 1,
  stock: 10,
  stockDate: today,
  endDate: "",
});

export function MedsTab({ data, update, w, today }: TabProps) {
  const meds = data.meds.filter((m) => m.profileId === data.activeId);
  const [edit, setEdit] = useState<Med | null>(null);

  function save(m: Med) {
    const clean: Med = {
      ...m,
      name: m.name.trim().slice(0, 60),
      dose: m.dose.trim().slice(0, 80),
      times: [...new Set(m.times.filter((t) => /^\d\d:\d\d$/.test(t)))].sort(),
      perDose: Math.min(10, Math.max(0, Number(m.perDose) || 0)),
      stock: Math.min(1000, Math.max(0, Math.floor(Number(m.stock) || 0))),
    };
    if (!clean.name || clean.times.length === 0) return;
    update((d) =>
      clean.id
        ? { ...d, meds: d.meds.map((x) => (x.id === clean.id ? clean : x)) }
        : { ...d, meds: [...d.meds, { ...clean, id: newId() }] },
    );
    setEdit(null);
  }

  function calendar() {
    const items = meds.flatMap((m) => m.times.map((t) => ({ time: t, kind: "med" as const, title: `💊 ${m.name}`, note: m.dose })));
    const blob = new Blob([routineToIcs(items, new Date())], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "dawa-reminder.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  if (edit) {
    const set = (p: Partial<Med>) => setEdit({ ...edit, ...p });
    return (
      <form
        className="health-card grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          save(edit);
        }}
      >
        <label className="text-sm text-slate-300">
          {w.medName}
          <input className="health-input mt-1" value={edit.name} onChange={(e) => set({ name: e.target.value })} required maxLength={60} data-testid="med-name" />
        </label>
        <label className="text-sm text-slate-300">
          {w.dose}
          <input className="health-input mt-1" value={edit.dose} onChange={(e) => set({ dose: e.target.value })} maxLength={80} />
        </label>
        <fieldset>
          <legend className="text-sm text-slate-300">{w.times}</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {edit.times.map((t, i) => (
              <span key={i} className="flex items-center gap-1">
                <input
                  type="time"
                  className="health-input w-32"
                  value={t}
                  onChange={(e) => set({ times: edit.times.map((x, j) => (j === i ? e.target.value : x)) })}
                />
                {edit.times.length > 1 && (
                  <button type="button" className="text-slate-400" onClick={() => set({ times: edit.times.filter((_, j) => j !== i) })} aria-label={w.delete}>
                    ✕
                  </button>
                )}
              </span>
            ))}
            {edit.times.length < 6 && (
              <button type="button" className="health-btn-ghost" onClick={() => set({ times: [...edit.times, "20:00"] })}>
                {w.addTime}
              </button>
            )}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-slate-300">
            {w.perDose}
            <input className="health-input mt-1" inputMode="decimal" value={edit.perDose} onChange={(e) => set({ perDose: Number(e.target.value) })} />
          </label>
          <label className="text-sm text-slate-300">
            {w.stock}
            <input
              className="health-input mt-1"
              inputMode="numeric"
              value={edit.stock}
              onChange={(e) => setEdit(withStock(edit, Number(e.target.value), data.taken, today))}
              data-testid="med-stock"
            />
          </label>
        </div>
        <label className="text-sm text-slate-300">
          {w.endDate}
          <input type="date" className="health-input mt-1" value={edit.endDate} min={today} onChange={(e) => set({ endDate: e.target.value })} />
        </label>
        <p className="text-xs text-slate-500">ℹ️ {w.asDoctor}</p>
        <div className="grid grid-cols-2 gap-2">
          <button className="health-btn" data-testid="med-save">
            {w.save}
          </button>
          <button type="button" className="health-btn-ghost justify-center" onClick={() => setEdit(null)}>
            {w.cancel}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="grid gap-3">
      <button type="button" className="health-btn" onClick={() => setEdit(blank(data.activeId, today))} data-testid="med-add">
        {w.addMed}
      </button>
      {meds.length === 0 && <p className="text-center text-slate-400">{w.medsEmpty}</p>}
      {meds.map((m) => {
        const left = stockLeft(m, data.taken);
        const days = daysLeft(m, data.taken);
        return (
          <div key={m.id} className="health-card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-lg font-bold text-white">💊 {m.name}</p>
                {m.dose && <p className="text-sm text-slate-300">{m.dose}</p>}
                <p className="text-sm text-cyan-200">⏰ {m.times.join(" · ")}</p>
                {m.endDate && <p className="text-xs text-slate-400">→ {m.endDate}</p>}
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${days <= 3 ? "text-amber-300" : "text-white"}`}>{left}</p>
                <p className="text-xs text-slate-400">{w.left}</p>
                {Number.isFinite(days) && (
                  <p className="text-xs text-slate-400">
                    {days} {w.daysLeftWord}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="health-btn-ghost" onClick={() => setEdit({ ...m })}>
                ✏️ {w.edit}
              </button>
              <button type="button" className="health-btn-ghost" onClick={() => setEdit(withStock(m, left, data.taken, today))}>
                🔄 {w.refilled}
              </button>
              <button
                type="button"
                className="health-btn-ghost text-red-200"
                onClick={() => update((d) => ({ ...d, meds: d.meds.filter((x) => x.id !== m.id) }))}
              >
                🗑️ {w.delete}
              </button>
            </div>
          </div>
        );
      })}
      {meds.length > 0 && (
        <button type="button" className="health-btn-ghost justify-center" onClick={calendar}>
          🔔 {w.reminders}
        </button>
      )}
      <p className="text-xs text-slate-500">ℹ️ {w.asDoctor}</p>
    </div>
  );
}
