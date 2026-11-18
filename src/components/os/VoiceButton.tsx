"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/LangProvider";
import { getOsWords } from "@/lib/os-content";

// Minimal typing for the browser's built-in speech recognition (Chrome on Android/Chromebook).
type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type RecCtor = new () => Rec;

/** Appends text to an existing input without React losing track of the value. */
export function appendSpoken(current: string, spoken: string): string {
  const s = spoken.trim();
  if (!s) return current;
  if (!current.trim()) return s;
  return /[\s\n]$/.test(current) ? current + s : `${current} ${s}`;
}

/**
 * "Speak" button (Beta): fills the field with id `target` from the doctor's voice, in Hindi or
 * English, using the browser's free speech service. Hidden where the browser has none.
 */
export function VoiceButton({ target }: { target: string }) {
  const { lang } = useT();
  const w = getOsWords(lang);
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const rec = useRef<Rec | null>(null);

  useEffect(() => {
    const g = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
    setSupported(!!(g.SpeechRecognition ?? g.webkitSpeechRecognition));
    return () => rec.current?.stop();
  }, []);

  if (!supported) return null;

  function toggle() {
    if (on) {
      rec.current?.stop();
      return;
    }
    const g = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
    const Ctor = (g.SpeechRecognition ?? g.webkitSpeechRecognition)!;
    const r = new Ctor();
    r.lang = lang === "en" ? "en-IN" : "hi-IN";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      const el = document.getElementById(target) as HTMLTextAreaElement | HTMLInputElement | null;
      if (!el) return;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) el.value = appendSpoken(el.value, e.results[i][0].transcript);
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    r.onend = () => setOn(false);
    r.onerror = () => setOn(false);
    rec.current = r;
    r.start();
    setOn(true);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={`btn-small min-h-10 gap-1.5 px-3 text-sm ${
        on ? "os-mic-on bg-rose-500 text-white" : "border border-rose-400/40 bg-rose-500/10 text-rose-100"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
      </svg>
      {on ? w.listening : `${w.speak} · Beta`}
    </button>
  );
}
