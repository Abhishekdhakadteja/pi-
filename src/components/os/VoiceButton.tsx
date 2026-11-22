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

const DEVANAGARI = "०१२३४५६७८९";
const NUMBER_WORDS: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9",
  शून्य: "0", एक: "1", दो: "2", तीन: "3", चार: "4", पांच: "5", पाँच: "5", छह: "6", छः: "6", सात: "7", आठ: "8", नौ: "9",
};

/** Mobile number / age from speech: "नौ आठ 765 ४३२१०" -> "98765" + "43210". Keeps digits only. */
export function spokenDigits(spoken: string): string {
  return spoken
    .split(/\s+/)
    .map((w) => NUMBER_WORDS[w.toLowerCase()] ?? w)
    .join(" ")
    .replace(/[०-९]/g, (d) => String(DEVANAGARI.indexOf(d)))
    .replace(/\D/g, "");
}

/**
 * "Speak" button (Beta): fills the field with id `target` from the doctor's voice, in Hindi or
 * English, using the browser's free speech service. Hidden where the browser has none.
 */
export function VoiceButton({
  target,
  locked = null,
  onSpoken,
  kind = "text",
  compact = false,
}: {
  /** id of the input/textarea to fill (uncontrolled fields) */
  target?: string;
  /** Basic: show a Pro link instead */
  locked?: string | null;
  /** for controlled fields: receives each finished phrase instead of writing to the DOM */
  onSpoken?: (text: string) => void;
  /** "digits": mobile number / age, keeps only the digits */
  kind?: "text" | "digits";
  /** small round mic next to a form field; listens for one phrase */
  compact?: boolean;
}) {
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
  if (locked)
    return (
      <a href="/pro" className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200" data-testid="voice-locked">
        🔒 {locked}
      </a>
    );

  function toggle() {
    if (on) {
      rec.current?.stop();
      return;
    }
    const g = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
    const Ctor = (g.SpeechRecognition ?? g.webkitSpeechRecognition)!;
    const r = new Ctor();
    r.lang = lang === "en" ? "en-IN" : "hi-IN";
    r.continuous = !compact;
    r.interimResults = false;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (!e.results[i].isFinal) continue;
        const said = e.results[i][0].transcript;
        if (onSpoken) {
          onSpoken(kind === "digits" ? spokenDigits(said) : said.trim());
          continue;
        }
        const el = target ? (document.getElementById(target) as HTMLTextAreaElement | HTMLInputElement | null) : null;
        if (!el) continue;
        if (kind === "digits") {
          const d = spokenDigits(said);
          if (d) el.value = d.slice(0, el.maxLength > 0 ? el.maxLength : undefined);
        } else el.value = appendSpoken(el.value, said);
        // Yellow until a person looks at it and types/taps: voice can mishear.
        el.dataset.voice = "1";
        el.addEventListener("keydown", () => delete el.dataset.voice, { once: true });
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    };
    r.onend = () => setOn(false);
    r.onerror = () => setOn(false);
    rec.current = r;
    r.start();
    setOn(true);
  }

  if (compact)
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        aria-label={on ? w.listening : w.speak}
        title={on ? w.listening : w.speak}
        className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
          on ? "os-mic-on bg-rose-500 text-white" : "border border-rose-300 bg-rose-50 text-rose-600"
        }`}
        data-testid={`mic-${target ?? "field"}`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
        </svg>
      </button>
    );

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
