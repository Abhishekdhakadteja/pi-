import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Lang } from "./i18n";
import { aiConfigured } from "./ai";
import { MAX_DICTATION_CHARS } from "./scribe-parse";

// AI Scribe (Pro): the doctor speaks the consultation, Claude fills the prescription form.
// Only the dictated words are sent, nothing else from the record.
// The doctor checks every box and presses Save; nothing is saved by the AI.

const SYSTEM = `You are a medical scribe at a small Indian clinic. A doctor dictated a consultation, in Hindi, English or a mix.
Turn ONLY what the doctor said into the prescription form fields.

Rules:
- Never add a medicine, dose, duration, test or diagnosis the doctor did not say. Never suggest treatment.
- For each medicine, "spoken" must be the doctor's exact words for that medicine, copied character for character from the dictation (same script).
- "medicine": the medicine name in standard English spelling with strength if said (e.g. "Paracetamol 650").
- "dose": morning-afternoon-night pattern when the doctor said how often, e.g. "1-0-1" for twice a day or सुबह-शाम, "1-1-1" for three times, "0-0-1" for night only. Otherwise the dose words as said, or "".
- "timing": "before_food" or "after_food" only if said (खाने से पहले / खाने के बाद), else "any".
- "days": the number of days said for that medicine, or 0 if not said.
- "note": any other instruction said for that medicine, or "".
- "diagnosis": the diagnosis only if the doctor said it, else "".
- "notes": the doctor's findings and advice in short clear sentences, in the language of the dictation. No medicines here.
- "follow_up_days": days until the next visit if said (e.g. "7 दिन बाद दिखाना" -> 7), else 0.`;

const SCHEMA = {
  type: "object",
  properties: {
    notes: { type: "string" },
    diagnosis: { type: "string" },
    medicines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          spoken: { type: "string" },
          medicine: { type: "string" },
          dose: { type: "string" },
          timing: { type: "string", enum: ["before_food", "after_food", "any"] },
          days: { type: "integer" },
          note: { type: "string" },
        },
        required: ["spoken", "medicine", "dose", "timing", "days", "note"],
        additionalProperties: false,
      },
    },
    follow_up_days: { type: "integer" },
  },
  required: ["notes", "diagnosis", "medicines", "follow_up_days"],
  additionalProperties: false,
} as const;

/** Returns the model's JSON (unchecked: run normalizeScribe on it), or null when AI is off. Throws on API failure. */
export async function draftPrescription(dictation: string, lang: Lang): Promise<unknown | null> {
  if (!aiConfigured()) return null;
  const client = new Anthropic({ timeout: 25_000, maxRetries: 1 });
  const response = await client.messages.create({
    // Haiku 5.5: pulling fields out of a short dictation is a narrow extraction task, and the
    // project runs lean on AI cost (about ₹0.05 per prescription; Sonnet 5.5 would be ~20x).
    // A medicine survives only if its spoken words are found in the dictation (scribe-parse.ts).
    model: "claude-haiku-5-5",
    max_tokens: 4000,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    system: `${SYSTEM}\nThe doctor's app language is ${lang === "en" ? "English" : "Hindi"}.`,
    messages: [{ role: "user", content: `Dictation:\n${dictation.slice(0, MAX_DICTATION_CHARS)}` }],
  });
  if (response.stop_reason === "refusal") throw new Error("ai_refused");
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
