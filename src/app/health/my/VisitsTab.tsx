"use client";
import { useState } from "react";
import Link from "next/link";
import { LEVEL_WORDS, VITALS, addDaysYmd, adherence, formatVital, isActiveOn, newId, vitalLevel, type VitalType } from "@/lib/health/pro-data";
import { EmergencyCard } from "./FamilyTab";
import type { TabProps } from "./ProApp";

function visitIcs(date: string, time: string, title: string): string {
  const d = date.replace(/-/g, "");
  const t = (time || "10:00").replace(":", "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Clinic Easy//Health Pro//HI",
    "BEGIN:VEVENT",
    `UID:visit-${d}${t}-${Math.random().toString(36).slice(2)}@clinic-easy`,
    `DTSTAMP:${d}T000000`,
    `DTSTART;TZID=Asia/Kolkata:${d}T${t}00`,
    "DURATION:PT30M",
    `SUMMARY:${title.replace(/[\\;,]/g, (c) => `\\${c}`)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Doctor visit",
    "TRIGGER:-PT12H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function download(name: string, text: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function VisitsTab({ data, update, w, lang, today }: TabProps) {
  const pid = data.activeId;
  const profile = data.profiles.find((p) => p.id === pid) ?? data.profiles[0];
  const [form, setForm] = useState({ date: addDaysYmd(today, 7), time: "10:00", doctor: "", note: "" });
  const [adding, setAdding] = useState(false);
  const [diary, setDiary] = useState("");
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [report, setReport] = useState(false);

  const visits = data.visits.filter((v) => v.profileId === pid).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const upcoming = visits.filter((v) => v.date >= today);
  const past = visits.filter((v) => v.date < today).reverse();
  const entries = data.diary.filter((d) => d.profileId === pid).sort((a, b) => b.at.localeCompare(a.at));
  const levelWord = (l: 1 | 2 | 3) => (l === 1 ? w.mild : l === 2 ? w.medium : w.severe);

  if (report) {
    const since = addDaysYmd(today, -30);
    const meds = data.meds.filter((m) => m.profileId === pid && isActiveOn(m, today));
    const adh = adherence(meds, data.taken, today, 30);
    const vit = data.vitals.filter((v) => v.profileId === pid && v.at.slice(0, 10) >= since).sort((a, b) => a.at.localeCompare(b.at));
    const types = [...new Set(vit.map((v) => v.type))] as VitalType[];
    const sym = entries.filter((e) => e.at.slice(0, 10) >= since);
    const text = [
      `${w.reportTitle}: ${profile.name}${profile.age ? ` (${profile.age})` : ""} · ${today}`,
      `${w.currentMeds}: ${meds.map((m) => `${m.name} ${m.dose} [${m.times.join(", ")}]`).join("; ") || w.none}`,
      adh !== null ? `${w.adherence30}: ${adh}%` : "",
      ...types.map((t) => `${lang === "hi" ? VITALS[t].hi : VITALS[t].en}: ${vit.filter((v) => v.type === t).map((v) => `${v.at.slice(5, 10)} ${formatVital(v)}`).join(", ")}`),
      sym.length ? `${w.diary}: ${sym.map((e) => `${e.at.slice(5, 10)} ${e.text} (${levelWord(e.level)})`).join("; ")}` : "",
      `${w.allergies}: ${profile.allergies || w.none} · ${w.conditions}: ${profile.conditions || w.none}`,
    ]
      .filter(Boolean)
      .join("\n");

    return (
      <div className="grid gap-3" data-testid="doctor-report">
        <div className="print-area health-card grid gap-3">
          <div>
            <p className="text-xl font-bold text-white">📋 {w.reportTitle}</p>
            <p className="text-sm text-slate-400">
              {profile.name} {profile.age && `(${profile.age})`} · {w.generated} {today}
            </p>
          </div>
          <div>
            <p className="font-semibold text-cyan-200">💊 {w.currentMeds}</p>
            {meds.length === 0 ? (
              <p className="text-sm text-slate-400">{w.none}</p>
            ) : (
              <ul className="text-sm text-slate-200">
                {meds.map((m) => (
                  <li key={m.id}>
                    • <b>{m.name}</b> {m.dose} · {m.times.join(", ")}
                  </li>
                ))}
              </ul>
            )}
            {adh !== null && (
              <p className="text-sm text-slate-300">
                {w.adherence30}: <b>{adh}%</b>
              </p>
            )}
          </div>
          <div>
            <p className="font-semibold text-cyan-200">📈 {w.history} ({w.last30})</p>
            {types.length === 0 && <p className="text-sm text-slate-400">{w.none}</p>}
            {types.map((t) => {
              const list = vit.filter((v) => v.type === t);
              return (
                <div key={t} className="mt-1 text-sm">
                  <p className="text-slate-300">
                    {lang === "hi" ? VITALS[t].hi : VITALS[t].en} ({VITALS[t].unit})
                  </p>
                  <p className="text-slate-100">
                    {list.map((v) => {
                      const l = vitalLevel(v.type, v.v1, v.v2);
                      return (
                        <span key={v.id} className="mr-2 inline-block">
                          {v.at.slice(5, 10)}: <b>{formatVital(v)}</b>
                          {l !== "ok" && <span className="text-amber-300"> ({lang === "hi" ? LEVEL_WORDS[l].hi : LEVEL_WORDS[l].en})</span>}
                        </span>
                      );
                    })}
                  </p>
                </div>
              );
            })}
          </div>
          <div>
            <p className="font-semibold text-cyan-200">📝 {w.diary} ({w.last30})</p>
            {sym.length === 0 ? (
              <p className="text-sm text-slate-400">{w.none}</p>
            ) : (
              <ul className="text-sm text-slate-200">
                {sym.map((e) => (
                  <li key={e.id}>
                    • {e.at.slice(5, 10)}: {e.text} ({levelWord(e.level)})
                  </li>
                ))}
              </ul>
            )}
          </div>
          <EmergencyCard data={data} profile={profile} w={w} today={today} />
          <p className="text-xs text-slate-500">{w.madeWith}</p>
        </div>
        <div className="no-print grid grid-cols-2 gap-2">
          <button type="button" className="health-btn" onClick={() => window.print()}>
            🖨️ {w.print}
          </button>
          <a className="health-btn-ghost health-wa justify-center" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
            💬 {w.shareWa}
          </a>
          <button type="button" className="health-btn-ghost col-span-2 justify-center" onClick={() => setReport(false)}>
            {w.back}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-3xl border border-cyan-400/40 bg-cyan-500/10 p-4">
        <p className="font-bold text-white">📋 {w.report}</p>
        <p className="mt-1 text-sm text-slate-300">{w.reportBody}</p>
        <button type="button" className="health-btn mt-3" onClick={() => setReport(true)} data-testid="report-make">
          {w.makeReport}
        </button>
      </section>

      <section className="health-card grid gap-2">
        <div className="flex items-center justify-between">
          <p className="font-bold text-white">🩺 {w.visits}</p>
          <Link href="/health/doctors" className="text-sm text-cyan-300 underline">
            {w.findDoctor} →
          </Link>
        </div>
        {adding ? (
          <form
            className="grid gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.date || !form.doctor.trim()) return;
              update((d) => ({ ...d, visits: [...d.visits, { id: newId(), profileId: pid, ...form, doctor: form.doctor.trim().slice(0, 80), note: form.note.slice(0, 200) }] }));
              setAdding(false);
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="health-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} aria-label={w.date} />
              <input type="time" className="health-input" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} aria-label={w.time} />
            </div>
            <input className="health-input" placeholder={w.doctor} value={form.doctor} maxLength={80} onChange={(e) => setForm({ ...form, doctor: e.target.value })} required />
            <input className="health-input" placeholder={w.note} value={form.note} maxLength={200} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <button className="health-btn">{w.save}</button>
              <button type="button" className="health-btn-ghost justify-center" onClick={() => setAdding(false)}>
                {w.cancel}
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="health-btn-ghost justify-center" onClick={() => setAdding(true)}>
            {w.addVisit}
          </button>
        )}
        {upcoming.length > 0 && <p className="mt-1 text-xs font-semibold text-slate-400">{w.upcoming}</p>}
        {upcoming.map((v) => (
          <div key={v.id} className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 p-3 text-sm">
            <span>
              <b className="text-white">
                {v.date} {v.time}
              </b>{" "}
              · {v.doctor}
              {v.note && <span className="block text-xs text-slate-400">{v.note}</span>}
            </span>
            <span className="flex gap-2">
              <button type="button" aria-label="calendar" onClick={() => download("visit.ics", visitIcs(v.date, v.time, `🩺 ${v.doctor}`), "text/calendar")}>
                🔔
              </button>
              <button type="button" aria-label={w.delete} className="text-slate-500" onClick={() => update((d) => ({ ...d, visits: d.visits.filter((x) => x.id !== v.id) }))}>
                ✕
              </button>
            </span>
          </div>
        ))}
        {past.length > 0 && <p className="mt-1 text-xs font-semibold text-slate-400">{w.past}</p>}
        {past.slice(0, 5).map((v) => (
          <p key={v.id} className="text-sm text-slate-400">
            {v.date} · {v.doctor}
          </p>
        ))}
      </section>

      <section className="health-card grid gap-2">
        <p className="font-bold text-white">📝 {w.diary}</p>
        <textarea className="health-input min-h-20" placeholder={w.diaryPh} value={diary} maxLength={300} onChange={(e) => setDiary(e.target.value)} />
        <div className="flex flex-wrap items-center gap-2">
          {([1, 2, 3] as const).map((l) => (
            <button key={l} type="button" className={`health-chip ${level === l ? "health-chip-on" : ""}`} onClick={() => setLevel(l)}>
              {levelWord(l)}
            </button>
          ))}
          <button
            type="button"
            className="health-btn ml-auto"
            onClick={() => {
              if (!diary.trim()) return;
              update((d) => ({ ...d, diary: [...d.diary, { id: newId(), profileId: pid, at: new Date().toISOString(), text: diary.trim(), level }].slice(-1000) }));
              setDiary("");
            }}
          >
            {w.save}
          </button>
        </div>
        <ul className="divide-y divide-white/5">
          {entries.slice(0, 10).map((e) => (
            <li key={e.id} className="flex justify-between gap-2 py-2 text-sm">
              <span className="text-slate-200">
                <span className="text-slate-500">{e.at.slice(5, 10)}</span> {e.text}
              </span>
              <span className={e.level === 3 ? "text-red-300" : e.level === 2 ? "text-amber-300" : "text-slate-400"}>{levelWord(e.level)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
