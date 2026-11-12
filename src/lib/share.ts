// Free sharing helpers: WhatsApp click-to-chat links and UPI payment links.
// Pure functions (unit tested). No API, no gateway, no per-message cost.

/** Opens WhatsApp (app or web) on the staff member's phone with the text filled in. */
export function waLink(phone: string, text: string): string {
  const to = /^[6-9][0-9]{9}$/.test(phone) ? `91${phone}` : "";
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

/** Valid UPI ID, e.g. drsharma@okaxis or 9876543210@ybl. */
export function isValidUpiId(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9._-]{2,64}@[A-Za-z0-9.-]{2,64}$/.test(v);
}

/**
 * UPI intent link (NPCI format). Any UPI app (PhonePe, GPay, Paytm, BHIM) opens it, and the
 * same text in a QR code is scanned by the patient. Money goes straight to the clinic's account.
 */
export function upiLink(o: { upiId: string; payee: string; amount?: number | null; note?: string }): string {
  const p = new URLSearchParams({ pa: o.upiId, pn: o.payee.slice(0, 50), cu: "INR" });
  if (o.amount && o.amount > 0) p.set("am", String(Math.round(o.amount)) + ".00");
  if (o.note) p.set("tn", o.note.slice(0, 60));
  return `upi://pay?${p.toString().replace(/\+/g, "%20")}`;
}

export type RxLine = { medicine: string; dose: string | null; timing: string | null; days: number; note: string | null };

const TIMING: Record<string, { hi: string; en: string }> = {
  before_food: { hi: "खाने से पहले", en: "before food" },
  after_food: { hi: "खाने के बाद", en: "after food" },
  any: { hi: "", en: "" },
};

/** Prescription as a WhatsApp message (sent by the doctor/attender to the patient's own number). */
export function rxMessage(o: {
  lang: "hi" | "en";
  clinic: string;
  doctor: string;
  patient: string;
  date: string;
  lines: RxLine[];
  nextVisit: string | null;
}): string {
  const hi = o.lang === "hi";
  const head = hi
    ? `${o.clinic}\nDr. ${o.doctor} का पर्चा\nमरीज़: ${o.patient} · ${o.date}`
    : `${o.clinic}\nPrescription by Dr. ${o.doctor}\nPatient: ${o.patient} · ${o.date}`;
  const body = o.lines
    .map((l, i) => {
      const parts = [l.dose, TIMING[l.timing ?? "any"]?.[o.lang], hi ? `${l.days} दिन` : `${l.days} days`, l.note].filter(Boolean);
      return `${i + 1}. ${l.medicine} — ${parts.join(", ")}`;
    })
    .join("\n");
  const tail = o.nextVisit
    ? hi
      ? `\nअगली बार मिलें: ${o.nextVisit} से पहले। दवा बीच में न छोड़ें।`
      : `\nNext visit: before ${o.nextVisit}. Do not stop medicines midway.`
    : "";
  return `${head}\n\n${body}${tail}`;
}
