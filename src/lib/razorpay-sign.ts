import { createHmac, timingSafeEqual } from "node:crypto";

// Razorpay signature checks (pure, so they are unit-tested).
//  - Checkout: HMAC-SHA256 of "order_id|payment_id" with the key secret.
//  - Webhook:  HMAC-SHA256 of the raw request body with the webhook secret.

function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkoutSignature(orderId: string, paymentId: string, secret: string): string {
  return createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  if (!orderId || !paymentId || !signature || !secret) return false;
  return safeEqualHex(checkoutSignature(orderId, paymentId, secret), signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  return safeEqualHex(createHmac("sha256", secret).update(rawBody).digest("hex"), signature);
}
