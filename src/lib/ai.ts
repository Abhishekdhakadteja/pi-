import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Lang } from "./i18n";

// Claude AI patient summary. The code is complete; it switches on when ANTHROPIC_API_KEY
// is set in Netlify. Until then aiConfigured() is false and the UI shows "Soon · Connect".

export function aiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY?.trim();
}

export type PatientRecord = {
  age: number | null;
  gender: string | null;
  complaint: string | null;
  visits: { date: string; diagnosis: string | null; notes: string | null }[];
  medicines: { date: string; medicine: string; dose: string | null; days: number }[];
};

const SYSTEM = `You help a doctor at a small Indian clinic prepare for a consultation.
You get one patient's record. Write 3 to 5 short bullet points a busy doctor can read in 10 seconds:
the main recurring problems, what was prescribed before and how long ago, anything to check today.
Use only facts in the record. Do not diagnose, do not suggest new medicines, do not invent values.
If the record is thin, say so in one bullet. Plain text, each bullet starting with "• ".`;

/** Returns bullet lines, or null when AI is not connected. Throws on API failure. */
export async function summarizePatient(record: PatientRecord, lang: Lang): Promise<string[] | null> {
  if (!aiConfigured()) return null;
  const client = new Anthropic({ timeout: 45_000, maxRetries: 1 });
  const language = lang === "hi" ? "Write in simple Hindi (Devanagari), keeping medicine names in English." : "Write in simple English.";
  const response = await client.beta.messages.create({
    // Haiku 5.5: the summary only restates recorded facts, so the cheapest model is enough
    // (about ₹0.04 per summary vs ₹1.80 on Opus). Haiku has no server-side refusal fallback.
    model: "claude-haiku-5-5",
    max_tokens: 4000,
    output_config: { effort: "low" },
    system: `${SYSTEM}\n${language}`,
    messages: [{ role: "user", content: `Patient record (JSON):\n${JSON.stringify(record)}` }],
  });
  if (response.stop_reason === "refusal") throw new Error("ai_refused");
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return text
    .split("\n")
    .map((l) => l.replace(/^[•\-*\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 6);
}
