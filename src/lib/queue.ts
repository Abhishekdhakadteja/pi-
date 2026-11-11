export type Q = { now_running: number | null; pending_tokens: number[]; done_tokens: number[] };

/** What the patient should see on the live queue page (numbers only). */
export function queueView(q: Q | null, token: number) {
  if (!q) return { ahead: null as number | null, state: "unknown" as const };
  if (q.done_tokens.includes(token)) return { ahead: 0, state: "done" as const };
  if (q.now_running === token) return { ahead: 0, state: "go_in" as const };
  const ahead = q.pending_tokens.filter((x) => x < token).length;
  if (q.pending_tokens.includes(token) && ahead <= 2) return { ahead, state: "soon" as const };
  return { ahead, state: "wait" as const };
}
