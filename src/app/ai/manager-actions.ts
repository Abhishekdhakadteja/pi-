"use server";
import { getStaff } from "@/lib/staff";
import { supabaseAdmin } from "@/lib/supabase/server";
import { todayIST } from "@/lib/dates";
import { DAILY_QUESTION_LIMIT, MAX_HISTORY_TURNS, MAX_QUESTION_CHARS } from "@/lib/ai-manager/tools-def";
import type { Turn } from "@/lib/ai-manager/agent";

export type AskResult = { ok: true; text: string } | { ok: false; error: "not_allowed" | "ai_off" | "pro" | "limit" | "empty" | "failed" };

/** Keeps only well-formed text turns, newest last, starting with a user turn. */
function cleanHistory(raw: unknown): Turn[] {
  if (!Array.isArray(raw)) return [];
  const turns = raw
    .filter(
      (t): t is Turn =>
        !!t &&
        typeof t === "object" &&
        (t.role === "user" || t.role === "assistant") &&
        typeof t.text === "string" &&
        t.text.trim().length > 0,
    )
    .map((t) => ({ role: t.role, text: t.text.slice(0, 2000) }))
    .slice(-MAX_HISTORY_TURNS);
  while (turns.length && turns[0].role !== "user") turns.shift();
  return turns;
}

/** One question to the AI मैनेजर. Any logged-in staff member of a Pro clinic; read-only. */
export async function askClinicAI(question: string, history: unknown): Promise<AskResult> {
  const staff = await getStaff();
  if (!staff) return { ok: false, error: "not_allowed" };
  const q = String(question ?? "").trim().slice(0, MAX_QUESTION_CHARS);
  if (!q) return { ok: false, error: "empty" };

  const { requireProAI } = await import("@/lib/ai-guard");
  const gate = await requireProAI(staff.clinic_id);
  if (!gate.ok) return { ok: false, error: gate.reason };
  const plan = gate.plan;

  // Fair use: count today's questions for the whole clinic (audit_log is admin-read only, so the
  // count uses the service role, filtered to this clinic).
  const limit = plan.tier === "pro_max" ? DAILY_QUESTION_LIMIT.pro_max : DAILY_QUESTION_LIMIT.pro;
  const { count } = await supabaseAdmin()
    .from("audit_log")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", staff.clinic_id)
    .eq("action", "ai_ask")
    .gte("time", `${todayIST()}T00:00:00+05:30`);
  if ((count ?? 0) >= limit) return { ok: false, error: "limit" };

  const [{ askManager }, { getLang }, { audit }] = await Promise.all([
    import("@/lib/ai-manager/agent"),
    import("@/lib/lang-server"),
    import("@/lib/audit"),
  ]);
  try {
    const answer = await askManager(staff, cleanHistory(history), q, await getLang());
    // Log that a question was asked and which lookups ran, not the question text itself.
    await audit(staff, "ai_ask", "ai_manager", null, { tools: answer.tools, chars: q.length });
    return { ok: true, text: answer.text };
  } catch (e) {
    console.error("[ai-manager] failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "failed" };
  }
}
