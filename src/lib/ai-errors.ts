// Turns an AI (Anthropic API) failure into one of a few plain kinds, so the doctor gets a clear
// message and the owner's error log says what to fix. The rest of the app never depends on AI:
// every AI call is optional and wrapped, so an AI outage or empty budget only hides AI answers.

export type AiFailKind = "budget" | "busy" | "timeout" | "key" | "other";

export function classifyAiError(e: unknown): AiFailKind {
  const err = e as { status?: number; name?: string; message?: string; error?: { error?: { type?: string; message?: string } } };
  const status = typeof err?.status === "number" ? err.status : 0;
  const text = `${err?.name ?? ""} ${err?.message ?? ""} ${err?.error?.error?.type ?? ""} ${err?.error?.error?.message ?? ""}`.toLowerCase();
  if (/timeout|timed out/.test(text)) return "timeout";
  if (status === 401 || /authentication|invalid x-api-key|api key/.test(text)) return "key";
  if (status === 402 || /credit balance|billing|spend limit|spending limit|usage limit|quota/.test(text)) return "budget";
  if (status === 429 || status === 529 || status === 503 || /overloaded|rate limit|rate_limit/.test(text)) return "busy";
  return "other";
}

/** Writes one line to the owner's error log (no patient data, only the feature and the kind). */
export async function reportAiFailure(feature: "summary" | "manager", kind: AiFailKind, path: string) {
  try {
    const { logError } = await import("@/lib/error-log");
    const hint =
      kind === "budget"
        ? "Anthropic budget/credit used up: raise the limit at console.anthropic.com → Billing"
        : kind === "key"
          ? "ANTHROPIC_API_KEY is wrong or revoked"
          : kind === "busy"
            ? "Anthropic busy or rate-limited (usually passes in minutes)"
            : kind === "timeout"
              ? "AI took too long"
              : "unexpected AI error";
    await logError({ source: "server", path, message: `[ai:${feature}] ${kind}: ${hint}` });
  } catch {
    // never let reporting break the page
  }
}
