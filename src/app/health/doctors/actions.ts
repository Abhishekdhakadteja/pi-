"use server";

import { placePhone } from "@/lib/health/places";
import { toWhatsAppNumber } from "@/lib/health/links";

/** Fetches one doctor's phone only when a person taps "show number" (keeps Google cost low). */
export async function revealPhone(placeId: string): Promise<{ phone: string | null; wa: string | null }> {
  if (typeof placeId !== "string") return { phone: null, wa: null };
  try {
    const phone = await placePhone(placeId);
    return { phone, wa: toWhatsAppNumber(phone) };
  } catch {
    return { phone: null, wa: null };
  }
}
