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
  const res = await fetch(`${base}/api/cron/reminders`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const text = await res.text();
  console.log(`reminders-cron: ${res.status} ${text.slice(0, 500)}`);
  return new Response(text, { status: res.status });
}

export const config = { schedule: "30 3 * * *" };
