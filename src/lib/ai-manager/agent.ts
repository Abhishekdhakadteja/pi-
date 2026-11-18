import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Staff } from "@/lib/staff";
import type { Lang } from "@/lib/i18n";
import { todayIST, nowTimeIST } from "@/lib/dates";
import { MAX_TOOL_ROUNDS, TOOL_SCHEMAS, toolsForRole } from "./tools-def";
import { runTool, ToolInputError } from "./tools";

// AI मैनेजर phase 1: Claude answers staff questions about their own clinic using read-only tools.
// The loop runs here on the server; the browser only ever sees the final text.

export type Turn = { role: "user" | "assistant"; text: string };
export type ManagerAnswer = { text: string; tools: string[] };

const MODEL = "claude-opus-5-5";
/** Netlify functions are cut off after ~26 s; past this point we stop calling tools and answer. */
const SOFT_DEADLINE_MS = 17_000;

const ROLE_HINT: Record<Staff["role"], string> = {
  attender:
    "The user is the ATTENDER (front desk): bookings, the queue, finding patients. They cannot see medical notes, diagnoses or clinic expenses, and you have no tools for those.",
  doctor:
    "The user is the DOCTOR: queue, patient medical history, prescriptions, follow-ups and the clinic's money.",
  admin:
    "The user is the ADMIN (owner/manager): queue, money, follow-ups and staff. Admin cannot read doctors' medical notes, and you have no tool for them.",
};

function systemPrompt(staff: Staff, lang: Lang): string {
  return [
    `You are "Clinic Easy AI Manager", the assistant inside a small Indian clinic's software. Clinic: ${staff.clinic.name}.`,
    ROLE_HINT[staff.role],
    `The user's name is ${staff.name}. Today is ${todayIST()} and the time is ${nowTimeIST()} (India).`,
    "",
    "How to answer:",
    "- Use the tools to look up real data before answering any question about patients, the queue, money, follow-ups or staff. Never guess or invent names, numbers or dates; if the tools return nothing, say so.",
    "- You can only READ data in this version. If the user asks you to book, edit, send, delete or change anything, say you cannot make changes yet, and tell them which screen does it (front desk / today's list for bookings, doctor screen for prescriptions, money screen for fees and expenses, messages for reminders, settings/staff for staff). Changing data by voice is coming in the next version.",
    "- You do not diagnose and do not decide treatment. You may summarise what is recorded for the doctor. Clinical decisions are always the doctor's.",
    "- Only discuss this clinic and its work. Refuse politely if asked about other clinics or for data the role cannot see.",
    "- Mobile numbers are shown masked; never ask for or reveal full numbers or addresses.",
    "- Keep answers short and easy to scan on a phone: a one-line answer first, then at most 8 short bullet lines. Amounts as ₹ with Indian digit grouping. No tables, no headings, no markdown symbols other than '• ' bullets.",
    lang === "hi"
      ? "- Reply in simple Hindi (Devanagari). Keep medicine names, patient names and English medical terms as they are. If the user writes in English, reply in English."
      : "- Reply in simple English. If the user writes in Hindi, reply in Hindi.",
  ].join("\n");
}

function toolDefs(staff: Staff): Anthropic.Beta.BetaTool[] {
  return toolsForRole(staff.role).map((name) => ({
    name,
    description: TOOL_SCHEMAS[name].description,
    input_schema: TOOL_SCHEMAS[name].input_schema as Anthropic.Beta.BetaTool.InputSchema,
  }));
}

function textOf(content: Anthropic.Beta.BetaContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

export async function askManager(staff: Staff, history: Turn[], question: string, lang: Lang): Promise<ManagerAnswer> {
  const client = new Anthropic({ timeout: 20_000, maxRetries: 1 });
  const started = Date.now();
  const system = systemPrompt(staff, lang);
  const tools = toolDefs(staff);
  const used: string[] = [];

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history.map((t) => ({ role: t.role, content: t.text })),
    { role: "user", content: question },
  ];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const mustAnswer = round === MAX_TOOL_ROUNDS || Date.now() - started > SOFT_DEADLINE_MS;
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system,
      tools,
      tool_choice: mustAnswer ? { type: "none" } : { type: "auto" },
      messages,
    });

    if (response.stop_reason === "refusal") throw new Error("ai_refused");

    if (response.stop_reason === "tool_use" && !mustAnswer) {
      messages.push({ role: "assistant", content: response.content });
      const calls = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
      const results = await Promise.all(
        calls.map(async (call): Promise<Anthropic.Beta.BetaToolResultBlockParam> => {
          used.push(call.name);
          try {
            const out = await runTool(staff, call.name, call.input);
            return { type: "tool_result", tool_use_id: call.id, content: JSON.stringify(out) };
          } catch (e) {
            const msg = e instanceof ToolInputError ? e.message : "lookup failed";
            if (!(e instanceof ToolInputError)) console.error("[ai-manager] tool failed", call.name, e instanceof Error ? e.message : e);
            return { type: "tool_result", tool_use_id: call.id, content: msg, is_error: true };
          }
        }),
      );
      messages.push({ role: "user", content: results });
      continue;
    }

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }

    const text = textOf(response.content);
    if (text) return { text, tools: used };
    if (mustAnswer) break;
    // Empty text without a tool call: ask once more for a plain answer.
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: "Please answer my question in plain words now." });
  }
  throw new Error("ai_no_answer");
}
