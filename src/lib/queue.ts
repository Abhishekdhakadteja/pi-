export type Q = { now_running: number | null; pending_tokens: number[]; done_tokens: number[]; home_tokens?: number[] | null };

/**
 * What the patient should see on the live queue page (numbers only).
 * `home`: this token was booked from home and the clinic calls such patients first at their time,
 * so only other home-booked tokens before it count as "ahead".
 */
export function queueView(q: Q | null, token: number) {
  if (!q) return { ahead: null as number | null, state: "unknown" as const, home: false };
  const home = (q.home_tokens ?? []).includes(token);
  if (q.done_tokens.includes(token)) return { ahead: 0, state: "done" as const, home };
  if (q.now_running === token) return { ahead: 0, state: "go_in" as const, home };
  const line = home ? (q.home_tokens ?? []) : q.pending_tokens;
  const ahead = line.filter((x) => x < token).length;
  if (q.pending_tokens.includes(token) && ahead <= 2) return { ahead, state: "soon" as const, home };
  return { ahead, state: "wait" as const, home };
}

/** True when the last 4 digits typed by the patient match the phone number on the reminder. */
export function last4Matches(phone: string, input: unknown): boolean {
  const d = String(input ?? "").replace(/\D/g, "");
  return d.length === 4 && /^\d{10}$/.test(phone) && phone.endsWith(d);
}
