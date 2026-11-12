"use client";
import { useT } from "@/components/LangProvider";
import type { DictKey } from "@/lib/i18n";

export const COMPLAINT_CHIPS: DictKey[] = [
  "chip_fever",
  "chip_cold",
  "chip_stomach",
  "chip_pain",
  "chip_bp",
  "chip_skin",
  "chip_followup",
];

/** Toggle one quick chip in a comma-separated complaint text. */
export function toggleChip(text: string, chip: string): string {
  const parts = text
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const i = parts.indexOf(chip);
  if (i >= 0) parts.splice(i, 1);
  else parts.push(chip);
  return parts.join(", ").slice(0, 300);
}

/** "What do you want to show the doctor?" with one-tap chips plus free text. */
export function ComplaintInput({ value, onChange, id = "complaint" }: { value: string; onChange: (v: string) => void; id?: string }) {
  const { t } = useT();
  const parts = value.split(",").map((p) => p.trim());
  return (
    <div className="flex flex-col gap-2">
      <label className="label" htmlFor={id}>
        {t("complaint")}
      </label>
      <p className="-mt-1 text-sm text-slate-500">{t("complaintHint")}</p>
      <div className="flex flex-wrap gap-2">
        {COMPLAINT_CHIPS.map((k) => {
          const word = t(k);
          const on = parts.includes(word);
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              className={`chip ${on ? "chip-on" : ""}`}
              onClick={() => onChange(toggleChip(value, word))}
            >
              {on ? "✓ " : "+ "}
              {word}
            </button>
          );
        })}
      </div>
      <textarea
        id={id}
        className="input min-h-20 py-3 text-lg"
        rows={2}
        maxLength={300}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
