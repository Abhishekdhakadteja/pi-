// AI Scribe: checks Claude's draft of a prescription before the doctor sees it.
// Pure functions (unit tested). The rule that matters most: a medicine reaches the form only
// if the doctor actually said it. Claude quotes the spoken words for each medicine ("spoken"),
// and we keep the line only when those words are really in the dictation. So the AI can
// tidy and fill boxes, but it can never add a medicine, whatever it outputs.

export type ScribeLine = { medicine: string; dose: string; timing: "before_food" | "after_food" | "any"; days: string; note: string };
export type ScribeDraft = {
  notes: string;
  diagnosis: string;
  lines: ScribeLine[];
  followUpDays: number | null;
  /** medicines Claude returned that were not found in what the doctor said (shown, never filled) */
  dropped: string[];
};

export const MAX_DICTATION_CHARS = 3000;
const TIMINGS = ["before_food", "after_food", "any"] as const;

/** Lower-case letters and digits only (Latin and Devanagari), single spaces. */
export function squash(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^a-z0-9ऀ-ॿ]+/g, " ")
    .trim();
}

/** True when the quoted words (at least 3 letters) appear in the dictation. */
export function saidInDictation(spoken: string, dictation: string): boolean {
  const q = squash(spoken);
  if (q.replace(/\s/g, "").length < 3) return false;
  return ` ${squash(dictation)} `.includes(` ${q} `) || squash(dictation).includes(q);
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** Validates the model's JSON. null = nothing usable. */
export function normalizeScribe(raw: unknown, dictation: string): ScribeDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const lines: ScribeLine[] = [];
  const dropped: string[] = [];
  const meds = Array.isArray(r.medicines) ? r.medicines.slice(0, 15) : [];
  for (const m of meds as Record<string, unknown>[]) {
    const medicine = str(m?.medicine, 120);
    if (!medicine) continue;
    if (!saidInDictation(str(m?.spoken, 200), dictation)) {
      dropped.push(medicine);
      continue;
    }
    const d = Number(m?.days);
    const timing = TIMINGS.includes(m?.timing as (typeof TIMINGS)[number]) ? (m.timing as ScribeLine["timing"]) : "any";
    lines.push({
      medicine,
      dose: str(m?.dose, 40),
      timing,
      days: Number.isInteger(d) && d >= 1 && d <= 365 ? String(d) : "",
      note: str(m?.note, 200),
    });
  }
  const f = Number(r.follow_up_days);
  const draft: ScribeDraft = {
    notes: typeof r.notes === "string" ? r.notes.trim().slice(0, 2000) : "",
    diagnosis: str(r.diagnosis, 300),
    lines,
    followUpDays: Number.isInteger(f) && f >= 1 && f <= 365 ? f : null,
    dropped,
  };
  if (!draft.notes && !draft.diagnosis && !lines.length && !dropped.length) return null;
  return draft;
}

/** "Next visit after N days" line added to the notes, in the doctor's language. */
export function followUpNote(days: number, lang: "hi" | "en"): string {
  return lang === "en" ? `Follow-up after ${days} days.` : `${days} दिन बाद दोबारा दिखाएँ।`;
}
