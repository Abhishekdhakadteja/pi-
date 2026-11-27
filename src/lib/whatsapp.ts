// Clinic Easy's own WhatsApp (the WhatsApp Business app on the company number).
// Client-safe: only public values. One place for the number and every prefilled message,
// so the site, the pricing buttons, the QR page and the owner's welcome messages all match.

import { cleanPhone } from "@/lib/contact";

/**
 * The number doctors chat with. Set NEXT_PUBLIC_WHATSAPP_NUMBER on Netlify when the new
 * WhatsApp Business SIM is ready; until then it is the Sales founder's number.
 */
export const WHATSAPP_NUMBER = cleanPhone(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "9340346510");
/** Optional: link of the "Clinic Easy AI" WhatsApp Channel (Updates tab → Channel → Share link). */
export const WHATSAPP_CHANNEL_URL = (process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL || "").trim();
/** Name shown on the WhatsApp Business profile. */
export const WHATSAPP_BUSINESS_NAME = "Clinic Easy AI";

export function waLink(text: string, phone: string = WHATSAPP_NUMBER): string {
  const p = cleanPhone(phone);
  const base = p ? `https://wa.me/91${p}` : "https://wa.me/";
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function waDisplay(phone: string = WHATSAPP_NUMBER): string {
  const p = cleanPhone(phone);
  return p ? `+91 ${p.slice(0, 5)} ${p.slice(5)}` : "";
}

/** Short keywords a doctor can send. The Business app's quick replies answer each one (see docs/WHATSAPP.md). */
export const KEYWORDS = {
  demo: "DEMO",
  plans: "PLANS",
  pro: "PRO",
  help: "HELP",
} as const;

export type BuyIntent = {
  plan: "basic" | "pro" | "pro_max";
  cycle: "month" | "year" | "first_month";
  clinicName?: string;
  doctorName?: string;
  clinicSlug?: string;
};

const PLAN_LABEL: Record<BuyIntent["plan"], string> = { basic: "Basic", pro: "AI Pro", pro_max: "Pro Max" };
const CYCLE_LABEL: Record<BuyIntent["cycle"], { hi: string; en: string }> = {
  month: { hi: "महीने का", en: "monthly" },
  year: { hi: "साल का", en: "yearly" },
  first_month: { hi: "पहला महीना ऑफ़र", en: "first-month offer" },
};

/** What the doctor's WhatsApp says when they tap "Get Pro on WhatsApp" inside the app. */
export function buyText(b: BuyIntent, lang: "hi" | "en" = "hi"): string {
  const plan = `Clinic Easy ${PLAN_LABEL[b.plan]} (${CYCLE_LABEL[b.cycle][lang]})`;
  const who = [b.doctorName, b.clinicName].filter(Boolean).join(", ");
  const ref = b.clinicSlug ? `\nRef: ${b.clinicSlug}` : "";
  return lang === "hi"
    ? `नमस्ते Clinic Easy AI 🙏\nमुझे ${plan} लेना है।${who ? `\nक्लिनिक: ${who}` : ""}${ref}\nकृपया UPI / भुगतान की जानकारी भेजें।`
    : `Hello Clinic Easy AI 🙏\nI want ${plan}.${who ? `\nClinic: ${who}` : ""}${ref}\nPlease send the UPI / payment details.`;
}

/** A visitor on the website taps "Chat on WhatsApp". */
export function helloText(lang: "hi" | "en" = "hi"): string {
  return lang === "hi"
    ? `नमस्ते Clinic Easy AI 🙏 मुझे अपनी clinic के लिए ${KEYWORDS.demo} देखना है।`
    : `Hello Clinic Easy AI 🙏 I want to see a ${KEYWORDS.demo} for my clinic.`;
}

/** The message (and greeting) that gives a doctor the 5-minute live demo link. */
export function demoInviteText(appUrl: string, doctorName = "", lang: "hi" | "en" = "hi"): string {
  const dr = doctorName ? ` Dr. ${doctorName.replace(/^dr\.?\s*/i, "")}` : "";
  const link = `${appUrl.replace(/\/$/, "")}/demo?ref=wa`;
  return lang === "hi"
    ? `नमस्ते${dr} 🙏 Clinic Easy AI में आपका स्वागत है।\n\n👉 5 मिनट का LIVE डेमो, बिना पासवर्ड, ख़ुद चलाकर देखें:\n${link}\n\nडेमो में नकली (demo) मरीज़ हैं: आज की लिस्ट, टोकन, पर्ची, फीस और हिसाब सब देख सकते हैं। 5 मिनट बाद डेमो अपने आप बंद हो जाएगा।\n\nपसंद आए तो "PRO" लिखें, हम 10 मिनट में आपकी clinic चालू कर देंगे।`
    : `Hello${dr} 🙏 Welcome to Clinic Easy AI.\n\n👉 Try a 5-minute LIVE demo yourself, no password needed:\n${link}\n\nIt has fake (demo) patients: today's list, tokens, prescriptions, fees and accounts. The demo closes by itself after 5 minutes.\n\nLike it? Reply "PRO" and we set up your clinic in 10 minutes.`;
}

/** Sent once a doctor has paid: welcome + how to start + demo link for their staff. */
export function welcomeText(p: { appUrl: string; doctorName?: string; clinicName?: string; plan: string; until?: string }, lang: "hi" | "en" = "hi"): string {
  const app = p.appUrl.replace(/\/$/, "");
  const dr = p.doctorName ? ` Dr. ${p.doctorName.replace(/^dr\.?\s*/i, "")}` : "";
  const plan = p.plan === "pro_max" ? "Pro Max" : p.plan === "pro" ? "AI Pro" : "Basic";
  const until = p.until ? (lang === "hi" ? ` (${p.until.slice(0, 10)} तक)` : ` (till ${p.until.slice(0, 10)})`) : "";
  return lang === "hi"
    ? `🎉 बधाई हो${dr}! ${p.clinicName ? `${p.clinicName} पर ` : ""}Clinic Easy ${plan}${until} चालू हो गया है।\n\n1️⃣ लॉगिन: ${app}/login\n2️⃣ स्टाफ़ को पहले 5 मिनट का डेमो दिखाएँ: ${app}/demo?ref=welcome\n3️⃣ कोई भी सवाल हो तो यहीं WhatsApp पर लिखें, हम तुरंत मदद करेंगे।\n\nधन्यवाद 🙏 टीम Clinic Easy AI`
    : `🎉 Congratulations${dr}! Clinic Easy ${plan}${until} is now active${p.clinicName ? ` for ${p.clinicName}` : ""}.\n\n1️⃣ Login: ${app}/login\n2️⃣ Show your staff the 5-minute demo first: ${app}/demo?ref=welcome\n3️⃣ Any question, just write here on WhatsApp.\n\nThank you 🙏 Team Clinic Easy AI`;
}
