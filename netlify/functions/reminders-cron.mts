// Netlify scheduled function: runs the daily reminder job.
// 03:30 UTC = 9:00 AM India time (same as the Vercel cron in vercel.json).
// It only calls the app's own protected route, so the reminder logic stays in one place.

export default async function handler(): Promise<Response> {
  const base = (process.env.APP_URL || process.env.URL || "").replace(/\/$/, "");
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error("reminders-cron: APP_URL/URL or CRON_SECRET is missing");
    return new Response("missing config", { status: 500 });
  }
  // The route works for ~8 s per call and says {"more":true} when time ran out; keep calling
  // (a scheduled function may run ~30 s) so even a big day is finished. Each call is safe to repeat.
  const started = Date.now();
  let last = new Response("no call", { status: 500 });
  for (let i = 0; i < 3; i++) {
    const res = await fetch(`${base}/api/cron/reminders`, { headers: { Authorization: `Bearer ${secret}` } });
    const text = await res.text();
    console.log(`reminders-cron: call ${i + 1}: ${res.status} ${text.slice(0, 500)}`);
    last = new Response(text, { status: res.status });
    let more = false;
    try {
      more = JSON.parse(text).more === true;
    } catch {}
    if (!res.ok || !more || Date.now() - started > 15_000) break;
  }
  return last;
}

export const config = { schedule: "30 3 * * *" };
