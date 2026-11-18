import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay-sign";
import { fulfilOrder } from "@/lib/subscription";

// Razorpay webhook (backup for the checkout handler, e.g. when the doctor closes the tab
// right after paying). In Razorpay Dashboard → Webhooks add
//   https://<site>/api/webhooks/razorpay   events: payment.captured, order.paid
// and put the same secret in Netlify as RAZORPAY_WEBHOOK_SECRET.
export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() ?? "";
  if (!secret) return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"), secret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let body: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; status?: string } } } };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const pay = body.payload?.payment?.entity;
  if ((body.event === "payment.captured" || body.event === "order.paid") && pay?.order_id && pay.id) {
    const r = await fulfilOrder(pay.order_id, pay.id);
    return NextResponse.json({ ok: r.ok });
  }
  return NextResponse.json({ ok: true, ignored: body.event ?? null });
}
