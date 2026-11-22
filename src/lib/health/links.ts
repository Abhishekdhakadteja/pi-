// Free contact links for the public doctor finder: call, WhatsApp (wa.me), Google Maps search.
// No paid API is needed for any of them.

import type { Lang } from "@/lib/i18n";

/**
 * "+91 98260 12345" / "098260 12345" / "9826012345" -> "919826012345". Short local numbers give null.
 * Some STD landlines also look like 10 digits; for those wa.me itself says "not on WhatsApp".
 */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? `91${d}` : null;
}

/** Digits for a tel: link; keeps a leading +. */
export function telHref(phone: string): string {
  const plus = phone.trim().startsWith("+") ? "+" : "";
  return `tel:${plus}${phone.replace(/\D/g, "")}`;
}

export function whatsAppBookingHref(waNumber: string, doctor: string, lang: Lang): string {
  const text =
    lang === "hi"
      ? `नमस्ते, मुझे ${doctor} से मिलने का समय (अपॉइंटमेंट) चाहिए। कृपया बताएं कौन सा दिन और समय खाली है। (Clinic Easy से)`
      : `Hello, I would like an appointment with ${doctor}. Please tell me which day and time is free. (via Clinic Easy)`;
  return `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
}

/** Google Maps search that works without any API key. */
export function mapsSearchHref(query: string, city: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${query} in ${city}`)}`;
}

/** City names: letters (any script), spaces, dots and hyphens, max 40 chars. */
export function cleanCity(v: unknown, fallback = "Guna"): string {
  const s = String(v ?? "")
    .replace(/[^\p{L}\p{M} .-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  return s || fallback;
}
