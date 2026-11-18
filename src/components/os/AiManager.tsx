"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useT } from "@/components/LangProvider";
import { askClinicAI } from "@/app/ai/manager-actions";
import { getManagerWords, SUGGESTIONS } from "@/lib/ai-manager/words";
import type { Role } from "@/lib/staff";
import { VoiceButton } from "./VoiceButton";

type Msg = { role: "user" | "assistant"; text: string; error?: boolean };
type Mode = "on" | "pro" | "key";

const INPUT_ID = "ai-manager-q";
const STORE = "ce-ai-manager-chat";

function Spark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l1.8 4.9L19 9.7l-4.2 3.1L16.2 18 12 15.1 7.8 18l1.4-5.2L5 9.7l5.2-1.8z" />
    </svg>
  );
}

/** Floating "AI मैनेजर" button + chat panel on every staff screen. */
export function AiManager({ role, mode }: { role: Role; mode: Mode }) {
  const { lang } = useT();
  const w = getManagerWords(lang);
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pending, start] = useTransition();
  const input = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);

  // Keep the chat for this browser tab only, so it survives moving between screens.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORE);
      if (saved) setMsgs(JSON.parse(saved) as Msg[]);
    } catch {
      /* storage blocked: start empty */
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(msgs.slice(-20)));
    } catch {
      /* ignore */
    }
    end.current?.scrollIntoView({ block: "end" });
  }, [msgs, pending]);

  function ask(text: string) {
    const q = text.trim();
    if (!q || pending) return;
    const history = msgs.filter((m) => !m.error).map(({ role: r, text: t }) => ({ role: r, text: t }));
    setMsgs((m) => [...m, { role: "user", text: q }]);
    if (input.current) input.current.value = "";
    start(async () => {
      const r = await askClinicAI(q, history);
      setMsgs((m) => [...m, r.ok ? { role: "assistant", text: r.text } : { role: "assistant", text: w.err[r.error], error: true }]);
    });
  }

  return (
    <div className="no-print">
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ai-manager-fab fixed bottom-5 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 py-3 pl-3.5 pr-4 text-base font-bold text-white shadow-[0_0_30px_rgba(167,139,250,0.55)] ring-1 ring-white/30"
          data-testid="ai-manager-open"
        >
          <Spark />
          {w.open}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={w.title}
          className="fixed inset-x-0 bottom-0 z-40 flex max-h-[88vh] flex-col rounded-t-3xl border border-violet-400/30 bg-[#070b1d]/95 shadow-[0_-10px_60px_rgba(124,58,237,0.35)] backdrop-blur-xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[420px] sm:rounded-3xl"
          data-testid="ai-manager-panel"
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 pb-3 pt-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 text-white">
                <Spark className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="font-brand text-lg font-bold leading-tight text-white">{w.title}</div>
                <div className="text-xs leading-snug text-slate-400">{w.sub}</div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {msgs.length > 0 && mode === "on" && (
                <button type="button" onClick={() => setMsgs([])} className="btn-small px-2.5 text-xs text-slate-300 ring-1 ring-white/15">
                  {w.clear}
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={w.close}
                className="grid h-10 w-10 place-items-center rounded-full text-slate-300 ring-1 ring-white/15"
              >
                ✕
              </button>
            </div>
          </div>

          {mode !== "on" ? (
            <div className="px-4 py-6">
              <p className="text-base text-slate-200">{mode === "pro" ? w.lockedPro : w.lockedKey}</p>
              <Link
                href={mode === "pro" ? "/pro" : "/ai#claude"}
                className="btn-small mt-4 inline-flex bg-gradient-to-r from-amber-300 to-pink-500 px-4 font-bold text-slate-950"
              >
                {mode === "pro" ? w.unlock : w.connect}
              </Link>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3" data-testid="ai-manager-log">
                {msgs.length === 0 && (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{w.tryThese}</div>
                    <div className="flex flex-col gap-2">
                      {SUGGESTIONS[lang][role].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => ask(s)}
                          className="rounded-2xl border border-violet-400/25 bg-violet-500/10 px-3 py-2.5 text-left text-[15px] text-violet-50"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-2.5">
                  {msgs.map((m, i) => (
                    <div
                      key={i}
                      className={
                        m.role === "user"
                          ? "ml-8 self-end rounded-2xl rounded-br-md bg-cyan-500/20 px-3 py-2 text-[15px] text-cyan-50"
                          : `mr-4 self-start whitespace-pre-wrap rounded-2xl rounded-bl-md px-3 py-2 text-[15px] leading-relaxed ${
                              m.error ? "border border-rose-400/40 bg-rose-500/10 text-rose-100" : "border border-white/10 bg-white/5 text-slate-100"
                            }`
                      }
                    >
                      {m.text}
                    </div>
                  ))}
                  {pending && (
                    <div className="self-start rounded-2xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-[15px] text-violet-100">
                      <span className="os-live-dot mr-2 inline-block h-2 w-2 rounded-full bg-violet-300" />
                      {w.thinking}
                    </div>
                  )}
                  <div ref={end} />
                </div>
              </div>

              <form
                className="border-t border-white/10 px-4 pb-4 pt-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  ask(input.current?.value ?? "");
                }}
              >
                <textarea
                  id={INPUT_ID}
                  ref={input}
                  rows={2}
                  maxLength={500}
                  placeholder={w.placeholder}
                  className="input min-h-0 w-full resize-none text-base"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      ask(input.current?.value ?? "");
                    }
                  }}
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <VoiceButton target={INPUT_ID} />
                  <button
                    type="submit"
                    disabled={pending}
                    className="btn-small ml-auto bg-gradient-to-r from-violet-500 to-cyan-500 px-5 font-bold text-white disabled:opacity-60"
                  >
                    {w.send}
                  </button>
                </div>
                <p className="mt-2 text-[11px] leading-snug text-slate-500">{w.privacy}</p>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
