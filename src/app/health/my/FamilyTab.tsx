"use client";
import { useRef, useState } from "react";
import { MAX_PROFILES, isActiveOn, newId, parseData, type Profile, type ProData } from "@/lib/health/pro-data";
import type { TabProps } from "./ProApp";
import type { ProWords } from "./words";

const BLOOD = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function EmergencyCard({ data, profile, w, today }: { data: ProData; profile: Profile; w: ProWords; today: string }) {
  const meds = data.meds.filter((m) => m.profileId === profile.id && isActiveOn(m, today));
  const row = (k: string, v: string) => (
    <p>
      <span className="text-slate-400">{k}: </span>
      <b>{v || w.none}</b>
    </p>
  );
  return (
    <div className="print-area rounded-3xl border-2 border-red-400/60 bg-red-950/30 p-4 text-slate-100" data-testid="emergency-card">
      <p className="text-lg font-black text-red-200">🪪 {w.card}</p>
      <p className="mt-1 text-2xl font-bold">
        {profile.name} {profile.age && <span className="text-base font-normal">({profile.age})</span>}
      </p>
      <div className="mt-2 grid gap-1 text-sm">
        {row(w.blood, profile.blood)}
        {row(w.allergies, profile.allergies)}
        {row(w.conditions, profile.conditions)}
        {row(w.currentMeds, meds.map((m) => `${m.name}${m.dose ? ` (${m.dose})` : ""}`).join(", "))}
        {row(w.contacts, profile.contacts.map((c) => `${c.name} ${c.phone}`).join(", "))}
      </div>
      <p className="mt-2 text-xs text-slate-400">Clinic Easy Health · {today}</p>
    </div>
  );
}

export function FamilyTab({ data, update, w, today }: TabProps) {
  const active = data.profiles.find((p) => p.id === data.activeId) ?? data.profiles[0];
  const [showCard, setShowCard] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const setP = (p: Partial<Profile>) => update((d) => ({ ...d, profiles: d.profiles.map((x) => (x.id === active.id ? { ...x, ...p } : x)) }));

  function backup() {
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `clinic-easy-health-backup-${today}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  async function restore(file: File) {
    try {
      const d = parseData(JSON.parse(await file.text()));
      if (!d) return setMsg(w.badFile);
      update(() => d);
      setMsg(w.restored);
    } catch {
      setMsg(w.badFile);
    }
  }

  if (showCard) {
    return (
      <div className="grid gap-3">
        <EmergencyCard data={data} profile={active} w={w} today={today} />
        <div className="no-print grid grid-cols-2 gap-2">
          <button type="button" className="health-btn" onClick={() => window.print()}>
            🖨️ {w.printCard}
          </button>
          <button type="button" className="health-btn-ghost justify-center" onClick={() => setShowCard(false)}>
            {w.back}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <section className="health-card">
        <p className="font-bold text-white">👨‍👩‍👧 {w.members}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {data.profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`health-chip ${p.id === active.id ? "health-chip-on" : ""}`}
              onClick={() => update((d) => ({ ...d, activeId: p.id }))}
            >
              {p.name}
            </button>
          ))}
          {data.profiles.length < MAX_PROFILES ? (
            <button
              type="button"
              className="health-chip"
              data-testid="member-add"
              onClick={() => {
                const id = newId();
                update((d) => ({
                  ...d,
                  activeId: id,
                  profiles: [...d.profiles, { id, name: `#${d.profiles.length + 1}`, relation: "", age: "", blood: "", allergies: "", conditions: "", contacts: [] }],
                }));
              }}
            >
              {w.addMember}
            </button>
          ) : (
            <span className="text-xs text-slate-400">{w.maxMembers}</span>
          )}
        </div>
      </section>

      <section className="health-card grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-slate-300">
            {w.name}
            <input className="health-input mt-1" value={active.name} maxLength={40} onChange={(e) => setP({ name: e.target.value })} data-testid="member-name" />
          </label>
          <label className="text-sm text-slate-300">
            {w.relation}
            <input className="health-input mt-1" value={active.relation === "self" ? w.self : active.relation} maxLength={30} onChange={(e) => setP({ relation: e.target.value })} />
          </label>
          <label className="text-sm text-slate-300">
            {w.age}
            <input className="health-input mt-1" inputMode="numeric" value={active.age} maxLength={3} onChange={(e) => setP({ age: e.target.value.replace(/\D/g, "") })} />
          </label>
          <label className="text-sm text-slate-300">
            {w.blood}
            <select className="health-input mt-1" value={active.blood} onChange={(e) => setP({ blood: e.target.value })}>
              {BLOOD.map((b) => (
                <option key={b} value={b}>
                  {b || "—"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="text-sm text-slate-300">
          {w.allergies}
          <input className="health-input mt-1" value={active.allergies} maxLength={120} onChange={(e) => setP({ allergies: e.target.value })} />
        </label>
        <label className="text-sm text-slate-300">
          {w.conditions}
          <input className="health-input mt-1" value={active.conditions} maxLength={120} onChange={(e) => setP({ conditions: e.target.value })} />
        </label>
        <fieldset>
          <legend className="text-sm text-slate-300">📞 {w.contacts}</legend>
          <div className="mt-1 grid gap-2">
            {active.contacts.map((c, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="health-input"
                  placeholder={w.contactName}
                  value={c.name}
                  maxLength={30}
                  onChange={(e) => setP({ contacts: active.contacts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
                />
                <input
                  className="health-input"
                  placeholder={w.phone}
                  inputMode="tel"
                  value={c.phone}
                  maxLength={14}
                  onChange={(e) => setP({ contacts: active.contacts.map((x, j) => (j === i ? { ...x, phone: e.target.value.replace(/[^\d+ ]/g, "") } : x)) })}
                  data-testid="contact-phone"
                />
                <button type="button" className="text-slate-400" aria-label={w.delete} onClick={() => setP({ contacts: active.contacts.filter((_, j) => j !== i) })}>
                  ✕
                </button>
              </div>
            ))}
            {active.contacts.length < 4 && (
              <button type="button" className="health-btn-ghost justify-center" onClick={() => setP({ contacts: [...active.contacts, { name: "", phone: "" }] })}>
                {w.addContact}
              </button>
            )}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="health-btn" onClick={() => setShowCard(true)} data-testid="card-show">
            🪪 {w.card}
          </button>
          {data.profiles.length > 1 && (
            <button
              type="button"
              className="health-btn-ghost justify-center text-red-200"
              onClick={() =>
                update((d) => {
                  const profiles = d.profiles.filter((p) => p.id !== active.id);
                  return {
                    ...d,
                    profiles,
                    activeId: profiles[0].id,
                    meds: d.meds.filter((m) => m.profileId !== active.id),
                    vitals: d.vitals.filter((m) => m.profileId !== active.id),
                    visits: d.visits.filter((m) => m.profileId !== active.id),
                    diary: d.diary.filter((m) => m.profileId !== active.id),
                  };
                })
              }
            >
              🗑️ {w.delete}
            </button>
          )}
        </div>
      </section>

      <section className="health-card grid gap-2">
        <p className="font-bold text-white">💾 {w.backup}</p>
        <p className="text-sm text-slate-400">{w.backupBody}</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="health-btn-ghost justify-center" onClick={backup}>
            ⬇️ {w.download}
          </button>
          <button type="button" className="health-btn-ghost justify-center" onClick={() => fileRef.current?.click()}>
            ⬆️ {w.restore}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void restore(f);
            e.target.value = "";
          }}
        />
        {msg && <p className="text-sm text-cyan-200">{msg}</p>}
      </section>
    </div>
  );
}
