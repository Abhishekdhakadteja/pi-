// Patient plans: Basic (free for everyone) and Patient Pro (₹499/month). Pure data, one source
// for the plan page, the owner page and the tests.

export const PATIENT_PRO = {
  mrpMonth: 999,
  month: 499,
  /** 12 months paid at once (2 months free) */
  year: 4999,
  trialDays: 7,
  /** Whole family on one plan */
  members: 6,
  /**
   * What one Pro patient costs us per month. The tools run on the phone and data stays there,
   * so only a share of hosting + payment fee: Netlify/Supabase share ≈ ₹10, Razorpay 2% + GST ≈ ₹12.
   */
  costPerMonth: 22,
} as const;

export type PatientFeature = { emoji: string; hi: string; en: string; basic: boolean; pro: boolean; soon?: boolean };

export const PATIENT_FEATURES: PatientFeature[] = [
  { emoji: "🩺", hi: "बीमारी लिखकर सही विशेषज्ञ डॉक्टर खोजें", en: "Find the right specialist from your problem", basic: true, pro: true },
  { emoji: "📅", hi: "Clinic Easy डॉक्टर से ऑनलाइन बुकिंग, बाकी से WhatsApp/कॉल", en: "Online booking with Clinic Easy doctors, WhatsApp/call others", basic: true, pro: true },
  { emoji: "🗓️", hi: "मेरा दिन: सेहतमंद दिनचर्या + कैलेंडर रिमाइंडर", en: "My day: healthy routine + calendar reminders", basic: true, pro: true },
  { emoji: "🚨", hi: "इमरजेंसी पहचान + 108 बटन", en: "Emergency signs + 108 button", basic: true, pro: true },
  { emoji: "💊", hi: "दवा ट्रैकर: हर खुराक पर टिक, गोलियाँ कितनी बचीं, खत्म होने से 3 दिन पहले अलर्ट", en: "Medicine tracker: tick each dose, tablets left, refill alert 3 days early", basic: false, pro: true },
  { emoji: "📈", hi: "सेहत रिकॉर्ड: BP, शुगर, ऑक्सीजन, पल्स, बुखार, वजन, ग्राफ़ और खतरे का संकेत", en: "Health log: BP, sugar, oxygen, pulse, fever, weight with trends and warning signs", basic: false, pro: true },
  { emoji: "👨‍👩‍👧", hi: "पूरा परिवार: 6 सदस्य एक ही प्लान में", en: "Whole family: 6 members on one plan", basic: false, pro: true },
  { emoji: "🆘", hi: "SOS: एक टैप में 108 + परिवार को WhatsApp पर लोकेशन", en: "SOS: one tap 108 + location to family on WhatsApp", basic: false, pro: true },
  { emoji: "🪪", hi: "इमरजेंसी हेल्थ कार्ड: ब्लड ग्रुप, एलर्जी, बीमारी, दवाइयाँ", en: "Emergency health card: blood group, allergies, conditions, medicines", basic: false, pro: true },
  { emoji: "📋", hi: "डॉक्टर रिपोर्ट: दवा + सेहत रिकॉर्ड + लक्षण एक पेज में, प्रिंट/PDF/WhatsApp", en: "Doctor report: medicines + readings + symptoms on one page, print/PDF/WhatsApp", basic: false, pro: true },
  { emoji: "🔔", hi: "अगली विज़िट और लक्षण डायरी, कैलेंडर रिमाइंडर", en: "Next visits and symptom diary with reminders", basic: false, pro: true },
  { emoji: "💾", hi: "प्राइवेट: डेटा सिर्फ़ आपके फोन में, बैकअप फ़ाइल", en: "Private: data stays on your phone, backup file", basic: false, pro: true },
  { emoji: "✨", hi: "AI हेल्थ असिस्टेंट और AI कॉल रिमाइंडर", en: "AI health assistant and AI call reminders", basic: false, pro: true, soon: true },
];

/** Profit per Pro patient per month at the launch price (before GST, which is passed on). */
export function patientProMargin(): { profit: number; percent: number } {
  const profit = PATIENT_PRO.month - PATIENT_PRO.costPerMonth;
  return { profit, percent: Math.round((profit / PATIENT_PRO.month) * 100) };
}
