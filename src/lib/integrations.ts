// The "AI services" hub inside the app. Every service is one of three kinds:
//  - "free": built into Clinic Easy and working today (no account, no cost).
//  - "key":  the code is fully written; it switches on as soon as the paid key is added
//            in Netlify (Site configuration > Environment variables). Until then it shows
//            a "Soon" badge with a Connect button and the exact steps.
//  - "soon": on the roadmap; shows a "Soon" badge and a Join button that explains what is needed.
// Never mark something "live" unless it really works on the live site.

import type { Lang } from "./i18n";
import type { Icon } from "./landing-content";

export type IntegrationKind = "free" | "key" | "soon";
export type IntegrationStatus = "live" | "connected" | "ready" | "soon";
export type IntegrationId =
  | "booking"
  | "queue"
  | "wa_link"
  | "rx"
  | "upi"
  | "voice_typing"
  | "auto_brief"
  | "claude"
  | "msg91"
  | "wa_cloud"
  | "voice_call"
  | "voice_rx"
  | "camera"
  | "video"
  | "location"
  | "attendance"
  | "abha"
  | "razorpay";

type Text = Record<Lang, string>;
export type Integration = {
  id: IntegrationId;
  kind: IntegrationKind;
  icon: Icon;
  /** accent for the logo tile: [from, to] */
  accent: [string, string];
  provider: string;
  title: Text;
  body: Text;
  /** keys that must ALL be set in Netlify for a "key" service to switch on */
  envKeys?: string[];
  /** extra env value that must match, e.g. MESSAGING_PROVIDER=msg91 */
  envMatch?: { key: string; value: string };
  /** setup steps (Connect) or what is needed (Join) */
  steps: Record<Lang, string[]>;
  cost: Text;
};

export const INTEGRATIONS: Integration[] = [
  // ---------- live today, free ----------
  {
    id: "booking",
    kind: "free",
    icon: "calendar",
    accent: ["#14d8b8", "#22b8f5"],
    provider: "Clinic Easy",
    title: { hi: "बुकिंग एजेंट", en: "Booking agent" },
    body: {
      hi: "मरीज़ QR या लिंक से खुद तारीख और समय चुनते हैं। दिन फुल हो तो अगली तारीख सुझाता है।",
      en: "Patients pick their own date and slot from a QR or link. Suggests the next date when a day is full.",
    },
    steps: { hi: [], en: [] },
    cost: { hi: "मुफ़्त", en: "Free" },
  },
  {
    id: "queue",
    kind: "free",
    icon: "queue",
    accent: ["#22b8f5", "#6366f1"],
    provider: "Clinic Easy",
    title: { hi: "लाइव कतार एजेंट", en: "Live queue agent" },
    body: {
      hi: "टोकन, अगला मरीज़ और मरीज़ के फ़ोन पर लाइव नंबर अपने-आप।",
      en: "Tokens, call-next and a live number on the patient's phone, automatically.",
    },
    steps: { hi: [], en: [] },
    cost: { hi: "मुफ़्त", en: "Free" },
  },
  {
    id: "wa_link",
    kind: "free",
    icon: "bell",
    accent: ["#22c55e", "#14d8b8"],
    provider: "WhatsApp (1-टैप)",
    title: { hi: "रिमाइंडर एजेंट", en: "Reminder agent" },
    body: {
      hi: "दवा खत्म, नई डोज़ और अगली विज़िट के मैसेज हर सुबह अपने-आप तैयार। स्टाफ 1 टैप में WhatsApp पर भेजता है।",
      en: "Medicine-ending, new-dose and next-visit messages are prepared every morning. Staff send each with one WhatsApp tap.",
    },
    steps: { hi: [], en: [] },
    cost: { hi: "मुफ़्त", en: "Free" },
  },
  {
    id: "rx",
    kind: "free",
    icon: "rx",
    accent: ["#a78bfa", "#22b8f5"],
    provider: "Clinic Easy",
    title: { hi: "पर्ची एजेंट", en: "Prescription agent" },
    body: {
      hi: "दवा, डोज़, दिन। कोर्स खत्म होने और अगली विज़िट की तारीख खुद गिनता है।",
      en: "Medicine, dose and days. Works out the course end and next-visit date itself.",
    },
    steps: { hi: [], en: [] },
    cost: { hi: "मुफ़्त", en: "Free" },
  },
  {
    id: "upi",
    kind: "free",
    icon: "wallet",
    accent: ["#f59e0b", "#22f5d0"],
    provider: "UPI QR",
    title: { hi: "हिसाब एजेंट", en: "Accounts agent" },
    body: {
      hi: "फ़ीस, UPI QR, खर्च और दिन/महीना/साल की बैलेंस शीट अपने-आप।",
      en: "Fees, UPI QR, expenses and the day/month/year balance sheet, automatically.",
    },
    steps: { hi: [], en: [] },
    cost: { hi: "मुफ़्त", en: "Free" },
  },
  {
    id: "auto_brief",
    kind: "free",
    icon: "spark",
    accent: ["#22f5d0", "#a78bfa"],
    provider: "Clinic Easy",
    title: { hi: "ऑटो ब्रीफ़", en: "Auto brief" },
    body: {
      hi: "आज की भीड़, कमाई, किसकी दवा खत्म हो रही है और कौन follow-up पर है: सब एक स्क्रीन पर। मरीज़ का छोटा सार डॉक्टर के सामने।",
      en: "Today's load, income, whose medicine is ending and who is due for follow-up, on one screen. A short patient brief for the doctor.",
    },
    steps: { hi: [], en: [] },
    cost: { hi: "मुफ़्त", en: "Free" },
  },
  {
    id: "voice_typing",
    kind: "free",
    icon: "mic",
    accent: ["#f43f5e", "#a78bfa"],
    provider: "Chrome वॉइस",
    title: { hi: "बोलकर नोट्स (Beta)", en: "Voice notes (Beta)" },
    body: {
      hi: "डॉक्टर बोलें, नोट्स अपने-आप लिख जाएँ। हिंदी और English। फ़ोन के Chrome की मुफ़्त वॉइस से।",
      en: "The doctor speaks and notes type themselves, Hindi and English, using the phone's free Chrome voice input.",
    },
    steps: { hi: [], en: [] },
    cost: { hi: "मुफ़्त", en: "Free" },
  },

  // ---------- code ready, needs a paid key ----------
  {
    id: "claude",
    kind: "key",
    icon: "brain",
    accent: ["#d97757", "#a78bfa"],
    provider: "Claude AI",
    title: { hi: "AI पेशेंट सारांश", en: "AI patient summary" },
    body: {
      hi: "मरीज़ की पूरी हिस्ट्री, दवाइयाँ और आज की तकलीफ़ पढ़कर AI 4-5 मुख्य पॉइंट डॉक्टर को देता है। नाम, फ़ोन और पता AI को नहीं भेजा जाता।",
      en: "AI reads the patient's full history, medicines and today's complaint and gives the doctor 4-5 key points. Name, phone and address are never sent to the AI.",
    },
    envKeys: ["ANTHROPIC_API_KEY"],
    steps: {
      hi: [
        "console.anthropic.com पर अकाउंट बनाएँ और API key बनाएँ।",
        "Netlify → Site configuration → Environment variables → ANTHROPIC_API_KEY जोड़ें।",
        "Deploys → Trigger deploy। डॉक्टर स्क्रीन पर “AI सारांश” बटन चालू हो जाएगा।",
      ],
      en: [
        "Create an account at console.anthropic.com and make an API key.",
        "Netlify → Site configuration → Environment variables → add ANTHROPIC_API_KEY.",
        "Deploys → Trigger deploy. The “AI summary” button on the doctor screen switches on.",
      ],
    },
    cost: { hi: "लगभग ₹1-2 प्रति सारांश", en: "About ₹1-2 per summary" },
  },
  {
    id: "msg91",
    kind: "key",
    icon: "phone",
    accent: ["#3b82f6", "#22b8f5"],
    provider: "MSG91 SMS",
    title: { hi: "ऑटो SMS रिमाइंडर", en: "Auto SMS reminders" },
    body: {
      hi: "रिमाइंडर बिना किसी टैप के सीधे मरीज़ के फ़ोन पर SMS से। OTP वाली बुकिंग भी चालू हो जाएगी।",
      en: "Reminders go straight to the patient's phone by SMS with no tap. OTP booking also switches on.",
    },
    envKeys: ["MSG91_AUTH_KEY", "MSG91_TEMPLATE_ID"],
    envMatch: { key: "MESSAGING_PROVIDER", value: "msg91" },
    steps: {
      hi: [
        "msg91.com पर अकाउंट बनाएँ, DLT पर sender ID और मैसेज template अप्रूव कराएँ (template में एक variable ##message##)।",
        "Netlify में जोड़ें: MSG91_AUTH_KEY, MSG91_TEMPLATE_ID और MESSAGING_PROVIDER = msg91।",
        "Trigger deploy। अगली सुबह से रिमाइंडर अपने-आप जाएँगे।",
      ],
      en: [
        "Create an msg91.com account and get a DLT sender ID and message template approved (one variable ##message##).",
        "In Netlify add MSG91_AUTH_KEY, MSG91_TEMPLATE_ID and MESSAGING_PROVIDER = msg91.",
        "Trigger deploy. From the next morning reminders go out by themselves.",
      ],
    },
    cost: { hi: "लगभग ₹0.20-0.25 प्रति SMS", en: "About ₹0.20-0.25 per SMS" },
  },
  {
    id: "wa_cloud",
    kind: "key",
    icon: "bell",
    accent: ["#22c55e", "#16a34a"],
    provider: "WhatsApp Business API",
    title: { hi: "ऑटो WhatsApp", en: "Auto WhatsApp" },
    body: {
      hi: "रिमाइंडर और पर्ची क्लिनिक के अपने WhatsApp Business नंबर से अपने-आप। स्टाफ को टैप भी नहीं करना।",
      en: "Reminders and prescriptions go automatically from the clinic's own WhatsApp Business number. No tapping.",
    },
    envKeys: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_TEMPLATE"],
    envMatch: { key: "MESSAGING_PROVIDER", value: "whatsapp" },
    steps: {
      hi: [
        "Meta Business में WhatsApp Cloud API सेट करें, क्लिनिक का नंबर जोड़ें और एक utility template अप्रूव कराएँ (body में एक variable {{1}})।",
        "Netlify में जोड़ें: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TEMPLATE (template का नाम) और MESSAGING_PROVIDER = whatsapp।",
        "Trigger deploy।",
      ],
      en: [
        "Set up WhatsApp Cloud API in Meta Business, add the clinic number and get a utility template approved (one body variable {{1}}).",
        "In Netlify add WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TEMPLATE (template name) and MESSAGING_PROVIDER = whatsapp.",
        "Trigger deploy.",
      ],
    },
    cost: { hi: "लगभग ₹0.12-0.15 प्रति मैसेज", en: "About ₹0.12-0.15 per message" },
  },

  // ---------- roadmap ----------
  {
    id: "voice_call",
    kind: "soon",
    icon: "phone",
    accent: ["#a78bfa", "#ec4899"],
    provider: "AI Voice",
    title: { hi: "AI वॉइस कॉलिंग", en: "AI voice calling" },
    body: {
      hi: "जो मरीज़ नहीं आए या जिनकी दवा खत्म है, AI खुद हिंदी में कॉल करके याद दिलाए और अगला समय बुक करे।",
      en: "AI calls patients who missed a visit or whose medicine ended, in Hindi, and books the next slot.",
    },
    steps: {
      hi: ["कॉलिंग नंबर (Exotel या Twilio) का अकाउंट", "AI आवाज़ (ElevenLabs) का अकाउंट", "मरीज़ की कॉल की सहमति"],
      en: ["A calling number account (Exotel or Twilio)", "An AI voice account (ElevenLabs)", "Patient consent for calls"],
    },
    cost: { hi: "लगभग ₹2-4 प्रति मिनट", en: "About ₹2-4 per minute" },
  },
  {
    id: "voice_rx",
    kind: "soon",
    icon: "mic",
    accent: ["#f43f5e", "#f59e0b"],
    provider: "AI Voice",
    title: { hi: "बोलकर पूरी पर्ची", en: "Full voice prescription" },
    body: {
      hi: "डॉक्टर दवा का नाम, डोज़ और दिन बोलें, AI पूरी पर्ची की लाइनें खुद भर दे।",
      en: "The doctor says medicine, dose and days; AI fills in every prescription line.",
    },
    steps: {
      hi: ["AI पेशेंट सारांश (Claude) कनेक्ट होना", "डॉक्टर की दवाओं की लिस्ट"],
      en: ["AI patient summary (Claude) connected", "The doctor's medicine list"],
    },
    cost: { hi: "लगभग ₹1 प्रति पर्ची", en: "About ₹1 per prescription" },
  },
  {
    id: "camera",
    kind: "soon",
    icon: "spark",
    accent: ["#22b8f5", "#a78bfa"],
    provider: "AI Vision",
    title: { hi: "कैमरा: रिपोर्ट पढ़ाई", en: "Camera: read reports" },
    body: {
      hi: "जाँच रिपोर्ट की फ़ोटो खींचें, AI मुख्य वैल्यू निकालकर मरीज़ की फ़ाइल में जोड़ दे।",
      en: "Snap a lab report; AI pulls out the key values and adds them to the patient's file.",
    },
    steps: {
      hi: ["फ़ोटो रखने की जगह (Supabase Storage)", "AI पेशेंट सारांश (Claude) कनेक्ट होना"],
      en: ["Photo storage (Supabase Storage)", "AI patient summary (Claude) connected"],
    },
    cost: { hi: "लगभग ₹1-2 प्रति रिपोर्ट", en: "About ₹1-2 per report" },
  },
  {
    id: "video",
    kind: "soon",
    icon: "video",
    accent: ["#6366f1", "#22b8f5"],
    provider: "Video",
    title: { hi: "वीडियो कंसल्ट", en: "Video consult" },
    body: {
      hi: "दूर के मरीज़ से वीडियो पर बात, बुकिंग के साथ अपने-आप लिंक।",
      en: "Video calls with far-away patients, with the link sent automatically on booking.",
    },
    steps: { hi: ["वीडियो सेवा का अकाउंट", "ऑनलाइन फ़ीस (Razorpay)"], en: ["A video service account", "Online fees (Razorpay)"] },
    cost: { hi: "लगभग ₹1 प्रति मिनट", en: "About ₹1 per minute" },
  },
  {
    id: "location",
    kind: "soon",
    icon: "map",
    accent: ["#14d8b8", "#f59e0b"],
    provider: "Maps",
    title: { hi: "लोकेशन और होम डिलीवरी", en: "Location and home delivery" },
    body: {
      hi: "मरीज़ की लोकेशन मैप पर, दूर वालों को दवा घर तक, डिलीवरी का स्टेटस लाइव।",
      en: "Patient location on a map, medicines to far-away patients, live delivery status.",
    },
    steps: { hi: ["मैप सेवा (Google Maps) की key", "डिलीवरी पार्टनर"], en: ["A map service (Google Maps) key", "A delivery partner"] },
    cost: { hi: "डिलीवरी पार्टनर के रेट", en: "Delivery partner rates" },
  },
  {
    id: "attendance",
    kind: "soon",
    icon: "team",
    accent: ["#22f5d0", "#22b8f5"],
    provider: "Clinic Easy",
    title: { hi: "स्टाफ ऑटो हाज़िरी", en: "Staff auto attendance" },
    body: {
      hi: "स्टाफ लॉगिन करते ही हाज़िरी लगे, देर और छुट्टी का हिसाब, महीने के अंत में सैलरी।",
      en: "Attendance marks itself at staff login, with late/leave tracking and month-end salary.",
    },
    steps: { hi: ["डेटाबेस अपडेट (एक SQL)"], en: ["A database update (one SQL)"] },
    cost: { hi: "मुफ़्त", en: "Free" },
  },
  {
    id: "abha",
    kind: "soon",
    icon: "shield",
    accent: ["#f59e0b", "#22c55e"],
    provider: "ABDM / ABHA",
    title: { hi: "ABHA हेल्थ ID", en: "ABHA health ID" },
    body: {
      hi: "मरीज़ की पक्की पहचान और रिकॉर्ड सरकारी ABHA हेल्थ ID से जुड़े।",
      en: "Trusted patient identity, with records linked to the government ABHA health ID.",
    },
    steps: { hi: ["ABDM sandbox रजिस्ट्रेशन", "क्लिनिक का HFR रजिस्ट्रेशन"], en: ["ABDM sandbox registration", "Clinic HFR registration"] },
    cost: { hi: "मुफ़्त (सरकारी)", en: "Free (government)" },
  },
  {
    id: "razorpay",
    kind: "soon",
    icon: "wallet",
    accent: ["#3b82f6", "#22f5d0"],
    provider: "Razorpay",
    title: { hi: "ऑनलाइन फ़ीस", en: "Online fees" },
    body: {
      hi: "बुकिंग के समय ही फ़ीस, पैसा सीधे डॉक्टर के खाते में, हिसाब अपने-आप।",
      en: "Fee paid at booking, straight to the doctor's account, accounts updated automatically.",
    },
    steps: { hi: ["Razorpay अकाउंट और KYC"], en: ["A Razorpay account and KYC"] },
    cost: { hi: "लगभग 2% प्रति पेमेंट", en: "About 2% per payment" },
  },
];

type Env = Record<string, string | undefined>;

/** Works out a service's badge from the server's environment. Pure, so it is easy to test. */
export function integrationStatus(i: Integration, env: Env): IntegrationStatus {
  if (i.kind === "free") return "live";
  if (i.kind === "soon") return "soon";
  const keysOk = (i.envKeys ?? []).every((k) => !!env[k]?.trim());
  const matchOk = !i.envMatch || env[i.envMatch.key] === i.envMatch.value;
  return keysOk && matchOk ? "connected" : "ready";
}

export function getIntegration(id: IntegrationId): Integration {
  const i = INTEGRATIONS.find((x) => x.id === id);
  if (!i) throw new Error(`unknown integration ${id}`);
  return i;
}
