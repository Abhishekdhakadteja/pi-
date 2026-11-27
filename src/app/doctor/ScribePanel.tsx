"use client";
import { useState, useTransition } from "react";
import { useT } from "@/components/LangProvider";
import { VoiceButton } from "@/components/os/VoiceButton";
import { ProBadge } from "@/components/ProBadge";
import { getScribeWords, SCRIBE_EVENT } from "@/lib/scribe-words";
import { followUpNote, type ScribeDraft } from "@/lib/scribe-parse";
import { aiScribe } from "./actions";

/** Writes AI text into an uncontrolled field and marks it yellow until the doctor touches it. */
function fill(id: string, value: string, append: boolean) {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el || !value) return;
  el.value = append && el.value.trim() ? `${el.value.trim()}\n${value}` : value;
  el.dataset.voice = "1";
  el.addEventListener("keydown", () => delete el.dataset.voice, { once: true });
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export function ScribePanel({ appointmentId, state }: { appointmentId: string; state: "on" | "locked" | "off" | "demo" }) {
  const { lang } = useT();
  const w = getScribeWords(lang);
  const [pending, start] = useTransition();
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string; extra?: string[] } | null>(null);

  return (
    <section className="card relative overflow-hidden ring-1 ring-fuchsia-400/40" data-testid="scribe">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold">🎙 {w.title}</h2>
        <ProBadge />
      </div>
      <p className="mt-1 text-sm text-slate-500">{w.lead}</p>

      {state === "locked" ? (
        <a href="/pro" className="btn-small mt-3 inline-flex bg-amber-300/10 font-bold text-amber-200 ring-1 ring-amber-300/40" data-testid="scribe-locked">
          🔒 {w.locked}
        </a>
      ) : state === "off" || state === "demo" ? (
        <p className="mt-3 text-sm text-slate-500" data-testid="scribe-off">{state === "demo" ? w.demo : w.off}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <textarea
              id="scribe-text"
              className="input min-h-28 flex-1 py-3 text-lg"
              placeholder={w.placeholder}
              value={text}
              maxLength={3000}
              onChange={(e) => setText(e.target.value)}
            />
            <VoiceButton onSpoken={(s) => setText((t) => (t.trim() ? `${t.trim()} ${s}` : s))} compact />
          </div>
          <p className="text-xs text-slate-500">{w.example}</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary flex-1 bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white"
              disabled={pending || text.trim().length < 6}
              data-testid="scribe-fill"
              onClick={() =>
                start(async () => {
                  const r = await aiScribe(appointmentId, text);
                  if (!r.ok) {
                    const e = r.error as keyof typeof w.errors;
                    setMsg({ ok: false, text: w.errors[e] ?? w.errors.ai_failed });
                    return;
                  }
                  const d: ScribeDraft = r.draft;
                  const notes = [d.notes, d.followUpDays ? followUpNote(d.followUpDays, lang === "en" ? "en" : "hi") : ""].filter(Boolean).join("\n");
                  fill("notes", notes, true);
                  fill("diagnosis", d.diagnosis, false);
                  if (d.lines.length) window.dispatchEvent(new CustomEvent(SCRIBE_EVENT, { detail: d.lines }));
                  const extra: string[] = [];
                  if (d.dropped.length) extra.push(`${w.dropped} ${d.dropped.join(", ")}`);
                  if (d.lines.some((l) => !l.days)) extra.push(w.noDays);
                  setMsg({ ok: true, text: d.lines.length ? w.done(d.lines.length) : w.doneNoMeds, extra });
                })
              }
            >
              {pending ? w.working : w.fill}
            </button>
            {text && (
              <button type="button" className="btn-small bg-white text-slate-700" onClick={() => { setText(""); setMsg(null); }}>
                {w.clear}
              </button>
            )}
          </div>
          {msg && (
            <div className={msg.ok ? "ok-box" : "error-box"} data-testid="scribe-result">
              {msg.text}
              {msg.extra?.map((x) => (
                <div key={x} className="mt-1 text-sm">{x}</div>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-500">🛡 {w.safety}</p>
        </div>
      )}
    </section>
  );
}
