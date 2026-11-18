// Words for the public front page (the first screen doctors see), in both languages.
// "live" = works in the app today. "soon" = on the roadmap; shown with a "Coming soon" badge
// so we never promise a doctor something the app cannot do yet.

import type { Lang } from "./i18n";

export type Status = "live" | "soon";
export type Icon =
  | "calendar"
  | "queue"
  | "rx"
  | "bell"
  | "wallet"
  | "team"
  | "phone"
  | "mic"
  | "brain"
  | "video"
  | "map"
  | "shield"
  | "spark"
  | "moon";

type Step = { time: string; title: string; body: string; icon: Icon; status: Status };
type Feature = { title: string; body: string; icon: Icon; status: Status };

export type Landing = {
  badge: string;
  headlineA: string;
  headlineB: string;
  sub: string;
  ctaLogin: string;
  ctaDay: string;
  pills: string[];
  dayTitle: string;
  daySub: string;
  day: Step[];
  featuresTitle: string;
  featuresSub: string;
  features: Feature[];
  live: string;
  soon: string;
  trustTitle: string;
  trust: { title: string; body: string }[];
  finalTitle: string;
  finalSub: string;
  footer: string;
};

const hi: Landing = {
  badge: "AI-POWERED CLINIC OS",
  headlineA: "आप इलाज कीजिए।",
  headlineB: "क्लिनिक AI चलाएगा।",
  sub: "बुकिंग, कतार, रिमाइंडर, follow-up और पूरा हिसाब अपने-आप। डॉक्टर का पूरा ध्यान सिर्फ़ मरीज़ पर।",
  ctaLogin: "क्लिनिक में लॉगिन करें",
  ctaDay: "AI के साथ एक दिन देखें",
  pills: ["24×7 ऑनलाइन बुकिंग", "ऑटो रिमाइंडर", "लाइव कतार", "1-टैप हिसाब"],
  dayTitle: "डॉक्टर का पूरा दिन, AI के साथ",
  daySub: "सुबह से रात तक, हर काम जो पहले हाथ से होता था, अब सिस्टम खुद संभालता है।",
  day: [
    {
      time: "सुबह 8:00",
      title: "दिन पहले से तैयार",
      body: "मरीज़ों ने खुद लिंक या QR से समय चुन लिया। आज की लिस्ट, खाली स्लॉट और कतार तैयार मिलती है।",
      icon: "calendar",
      status: "live",
    },
    {
      time: "OPD",
      title: "लाइव कतार, बिना भीड़",
      body: "हर मरीज़ अपने फ़ोन पर अपना नंबर लाइव देखता है। रिसेप्शन पर हल्ला नहीं, इंतज़ार कम।",
      icon: "queue",
      status: "live",
    },
    {
      time: "जाँच के समय",
      title: "पूरी हिस्ट्री एक टैप में",
      body: "पिछली विज़िट, बीमारी और दवाइयाँ सामने। पर्ची सेकंडों में, प्रिंट या WhatsApp पर।",
      icon: "rx",
      status: "live",
    },
    {
      time: "विज़िट के बाद",
      title: "दवा खत्म होने से पहले याद",
      body: "दवा का कोर्स खत्म होने, नई डोज़ और अगली विज़िट का रिमाइंडर मरीज़ को अपने-आप।",
      icon: "bell",
      status: "live",
    },
    {
      time: "शाम",
      title: "हिसाब अपने-आप",
      body: "दिन, महीने और साल की कमाई, खर्च और बैलेंस शीट तैयार। UPI QR से सीधा पेमेंट।",
      icon: "wallet",
      status: "live",
    },
    {
      time: "रात",
      title: "AI कॉल और follow-up",
      body: "जो मरीज़ नहीं आए, उन्हें AI खुद कॉल करके याद दिलाएगा और अगला समय बुक करेगा।",
      icon: "moon",
      status: "soon",
    },
  ],
  featuresTitle: "AI सुविधाएँ",
  featuresSub: "आज से चालू, और जल्द आने वाली अगली पीढ़ी की सुविधाएँ।",
  features: [
    { title: "स्मार्ट बुकिंग", body: "WhatsApp लिंक और QR से 24×7 अपॉइंटमेंट। दिन फुल हो तो अगली तारीख खुद सुझाए।", icon: "calendar", status: "live" },
    { title: "लाइव कतार", body: "मरीज़ के फ़ोन पर लाइव नंबर। डॉक्टर और रिसेप्शन एक ही स्क्रीन पर।", icon: "queue", status: "live" },
    { title: "डिजिटल पर्ची", body: "दवा, डोज़ और दिन। प्रिंट करें या WhatsApp पर भेजें।", icon: "rx", status: "live" },
    { title: "ऑटो रिमाइंडर", body: "दवा खत्म, नई डोज़, अगली विज़िट। सेहत की चिंता वाले भरोसेमंद मैसेज।", icon: "bell", status: "live" },
    { title: "कमाई और बैलेंस शीट", body: "फ़ीस, खर्च, UPI और रिपोर्ट Excel में एक क्लिक पर।", icon: "wallet", status: "live" },
    { title: "स्टाफ मैनेजमेंट", body: "डॉक्टर, रिसेप्शन और एडमिन के अलग लॉगिन और अधिकार।", icon: "team", status: "live" },
    { title: "AI वॉइस कॉलिंग", body: "रिमाइंडर, कन्फ़र्मेशन और follow-up के लिए AI खुद मरीज़ को कॉल करे।", icon: "phone", status: "soon" },
    { title: "बोलकर पर्ची", body: "डॉक्टर बोलें, AI पर्ची लिख दे। टाइप करने की ज़रूरत नहीं।", icon: "mic", status: "soon" },
    { title: "AI पेशेंट सारांश", body: "मरीज़ की पूरी हिस्ट्री के मुख्य पॉइंट, जाँच से पहले।", icon: "brain", status: "soon" },
    { title: "वीडियो कंसल्ट और कैमरा", body: "दूर के मरीज़ से वीडियो पर बात, रिपोर्ट की फ़ोटो से AI पढ़ाई।", icon: "video", status: "soon" },
    { title: "लोकेशन और होम डिलीवरी", body: "मरीज़ की लोकेशन मैप पर, दूर वालों को दवा घर तक।", icon: "map", status: "soon" },
    { title: "वेरिफ़ाइड डॉक्टर और मरीज़", body: "मोबाइल OTP और ABHA हेल्थ ID से पक्की पहचान।", icon: "shield", status: "soon" },
  ],
  live: "चालू",
  soon: "जल्द",
  trustTitle: "भरोसा और सुरक्षा",
  trust: [
    { title: "भारत में डेटा", body: "मरीज़ों का डेटा मुंबई के सर्वर पर।" },
    { title: "हर रोल की अलग चाबी", body: "डॉक्टर के नोट्स सिर्फ़ डॉक्टर देख सकते हैं।" },
    { title: "सस्ते फ़ोन पर भी तेज़", body: "हिंदी और English, कम इंटरनेट में भी चले।" },
  ],
  finalTitle: "आपका क्लिनिक, अब ऑटो-पायलट पर।",
  finalSub: "अपनी टीम के साथ लॉगिन करें और आज से शुरू करें।",
  footer: "Clinic Easy · AI-powered clinic OS",
};

const en: Landing = {
  badge: "AI-POWERED CLINIC OS",
  headlineA: "You treat patients.",
  headlineB: "AI runs the clinic.",
  sub: "Booking, queue, reminders, follow-ups and accounts run on autopilot, so the doctor's attention stays on the patient.",
  ctaLogin: "Log in to your clinic",
  ctaDay: "See a day with AI",
  pills: ["24×7 online booking", "Auto reminders", "Live queue", "1-tap accounts"],
  dayTitle: "A doctor's whole day, with AI",
  daySub: "From morning to night, every task that used to be manual is now handled by the system.",
  day: [
    { time: "8:00 AM", title: "Your day is ready", body: "Patients picked their own slot from a link or QR. Today's list, free slots and queue are ready.", icon: "calendar", status: "live" },
    { time: "OPD", title: "Live queue, no crowd", body: "Every patient sees their number live on their phone. Calm reception, shorter waits.", icon: "queue", status: "live" },
    { time: "Consultation", title: "Full history in one tap", body: "Past visits, illness and medicines in front of you. Prescription in seconds, printed or on WhatsApp.", icon: "rx", status: "live" },
    { time: "After the visit", title: "Reminded before medicine runs out", body: "Course ending, new dose and next visit reminders go to the patient automatically.", icon: "bell", status: "live" },
    { time: "Evening", title: "Accounts done for you", body: "Daily, monthly and yearly income, expenses and balance sheet. Direct UPI QR payments.", icon: "wallet", status: "live" },
    { time: "Night", title: "AI calls and follow-ups", body: "Patients who missed a visit get an AI call that reminds them and books the next slot.", icon: "moon", status: "soon" },
  ],
  featuresTitle: "AI features",
  featuresSub: "Live today, plus the next generation coming soon.",
  features: [
    { title: "Smart booking", body: "24×7 appointments by WhatsApp link and QR. Suggests the next date when a day is full.", icon: "calendar", status: "live" },
    { title: "Live queue", body: "Live number on the patient's phone. Doctor and reception on one screen.", icon: "queue", status: "live" },
    { title: "Digital prescription", body: "Medicine, dose and days. Print it or send on WhatsApp.", icon: "rx", status: "live" },
    { title: "Auto reminders", body: "Medicine ending, new dose, next visit. Caring, health-first messages.", icon: "bell", status: "live" },
    { title: "Income and balance sheet", body: "Fees, expenses, UPI and Excel reports in one click.", icon: "wallet", status: "live" },
    { title: "Staff management", body: "Separate logins and rights for doctor, reception and admin.", icon: "team", status: "live" },
    { title: "AI voice calling", body: "AI calls patients itself for reminders, confirmations and follow-ups.", icon: "phone", status: "soon" },
    { title: "Voice prescription", body: "The doctor speaks, AI writes the prescription. No typing.", icon: "mic", status: "soon" },
    { title: "AI patient summary", body: "Key points of a patient's full history before the consultation.", icon: "brain", status: "soon" },
    { title: "Video consult and camera", body: "Video calls with far-away patients; AI reads photos of reports.", icon: "video", status: "soon" },
    { title: "Location and home delivery", body: "Patient location on a map; medicines delivered to far-away patients.", icon: "map", status: "soon" },
    { title: "Verified doctors and patients", body: "Trusted identity with mobile OTP and ABHA health ID.", icon: "shield", status: "soon" },
  ],
  live: "Live",
  soon: "Soon",
  trustTitle: "Trust and security",
  trust: [
    { title: "Data in India", body: "Patient data stays on servers in Mumbai." },
    { title: "A key for every role", body: "Doctor's notes are visible to the doctor only." },
    { title: "Fast on cheap phones", body: "Hindi and English, works on slow internet." },
  ],
  finalTitle: "Your clinic, now on autopilot.",
  finalSub: "Log in with your team and start today.",
  footer: "Clinic Easy · AI-powered clinic OS",
};

export function getLanding(lang: Lang): Landing {
  return lang === "en" ? en : hi;
}
