import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/server-env";
import { normalizePhone } from "@/lib/validate";
import { isStopMessage } from "@/lib/reminder-text";
import { optOutPhone } from "@/lib/reminders";

// Incoming SMS / WhatsApp replies. Point your MSG91 / WhatsApp "inbound message" webhook here:
//   POST /api/webhooks/inbound-sms?secret=<INBOUND_WEBHOOK_SECRET>
// Accepts JSON or form data with the sender number in one of: from, mobile, sender, msisdn
// and the text in one of: text, message, content, body.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const given = Buffer.from(req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-webhook-secret") ?? "");
  const expected = Buffer.from(serverEnv.inboundWebhookSecret());
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: Record<string, unknown> = {};
  const type = req.headers.get("content-type") ?? "";
  try {
    body = type.includes("application/json") ? await req.json() : Object.fromEntries((await req.formData()).entries());
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const from = normalizePhone(String(body.from ?? body.mobile ?? body.sender ?? body.msisdn ?? ""));
  const text = body.text ?? body.message ?? body.content ?? body.body;
  if (!from) return NextResponse.json({ ok: true, ignored: "no sender" });
  if (!isStopMessage(text)) return NextResponse.json({ ok: true, ignored: "not a STOP message" });
  const n = await optOutPhone(from);
  console.log(`[inbound] STOP from +91${from}: opted out ${n} patient record(s)`);
  return NextResponse.json({ ok: true, optedOut: n });
}
