import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runReminderJob } from "@/lib/reminders";
import { serverEnv } from "@/lib/server-env";

// Called every day at 9:00 AM India time (03:30 UTC) by Vercel Cron (see vercel.json)
// or any scheduler: GET /api/cron/reminders with header "Authorization: Bearer <CRON_SECRET>".
export const dynamic = "force-dynamic";

function authorized(req: NextRequest) {
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${serverEnv.cronSecret()}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function handle(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const summary = await runReminderJob();
    console.log("[reminders] job finished", summary);
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    console.error("[reminders] job failed", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
