// Words for the "AI Clinic OS" parts of the staff screens, in both languages.

import type { Lang } from "./i18n";

const hi = {
  osBadge: "AI CLINIC OS",
  centerTitle: "AI कमांड सेंटर",
  centerSub: "आपका क्लिनिक ऑटो-पायलट पर। एजेंट क्या कर रहे हैं और आपको क्या करना है, सब यहाँ।",
  briefTitle: "आज की AI ब्रीफ़",
  systemsOk: "सभी सिस्टम चालू",
  patientsToday: "आज मरीज़",
  waitingNow: "अभी इंतज़ार में",
  doneToday: "देख लिए",
  collectionToday: "आज की कमाई",
  insightsTitle: "एजेंट ने देखा",
  open: "खोलें",
  agentsTitle: "आपके AI एजेंट",
  agentsSub: "जो चालू हैं वो अपने-आप काम कर रहे हैं। “जल्द” वाले बस एक कनेक्शन दूर हैं।",
  hubTitle: "AI सेवाएँ और कनेक्शन",
  hubSub: "पेड सेवाओं का पूरा कोड तैयार है। सिर्फ़ उनकी key जोड़नी है, फिर अपने-आप चालू।",
  live: "चालू",
  connected: "कनेक्टेड",
  ready: "जल्द",
  soon: "जल्द",
  connect: "कनेक्ट करें",
  join: "जुड़ें",
  hide: "बंद करें",
  readyNote: "कोड तैयार है। सिर्फ़ यह करना है:",
  soonNote: "यह सुविधा जल्द आ रही है। इसके लिए चाहिए:",
  adminOnly: "यह क्लिनिक के एडमिन/मालिक कनेक्ट करेंगे।",
  cost: "खर्च",
  openCenter: "AI कमांड सेंटर खोलें",
  // insights
  insEmpty: "आज अभी कोई मरीज़ नहीं। बुकिंग लिंक और QR मरीज़ों तक पहुँचाएँ।",
  insWaiting: (n: number) => `${n} मरीज़ इंतज़ार में हैं। कतार चल रही है।`,
  insNoneWaiting: "कोई इंतज़ार में नहीं। कतार खाली है।",
  insMedEnding: (n: number, names: string) => `${n} मरीज़ों की दवा 3 दिन में खत्म हो रही है: ${names}`,
  insFollowUp: (n: number) => `${n} मरीज़ों की अगली विज़िट आज है।`,
  insMessages: (n: number) => `${n} रिमाइंडर मैसेज तैयार हैं, 1 टैप में भेजें।`,
  insMissed: (n: number) => `${n} मरीज़ आज नहीं आए। उन्हें दोबारा बुलाएँ।`,
  insUnpaid: (n: number) => `${n} देखे गए मरीज़ों की फ़ीस अभी दर्ज नहीं।`,
  insAllClear: "सब काम पूरा। आज कोई बकाया नहीं।",
  // patient brief
  pbTitle: "AI पेशेंट ब्रीफ़",
  pbAuto: "ऑटो सार",
  pbFirstVisit: "पहली बार आए हैं।",
  pbVisits: (n: number, last: string) => `${n} बार पहले आ चुके हैं, आखिरी बार ${last}।`,
  pbLastDx: (d: string) => `पिछली बीमारी: ${d}`,
  pbLastRx: (m: string) => `पिछली दवाइयाँ: ${m}`,
  pbCourse: (end: string) => `पिछला दवा कोर्स ${end} को खत्म।`,
  pbToday: (c: string) => `आज की तकलीफ़: ${c}`,
  pbAi: "AI सारांश बनाएँ",
  pbAiWorking: "AI पढ़ रहा है...",
  pbAiFailed: "AI सारांश अभी नहीं बन सका। थोड़ी देर बाद कोशिश करें।",
  pbAiOff: "AI सारांश (Claude) जल्द। कनेक्ट करें →",
  pbAiNote: "AI सिर्फ़ मदद के लिए है। फ़ैसला डॉक्टर का।",
  // voice
  speak: "बोलें",
  listening: "सुन रहा है... रोकने के लिए दबाएँ",
  voiceUnsupported: "इस ब्राउज़र में बोलकर लिखना नहीं चलता। Chrome इस्तेमाल करें।",
};

type OsWords = typeof hi;

const en: OsWords = {
  osBadge: "AI CLINIC OS",
  centerTitle: "AI Command Center",
  centerSub: "Your clinic on autopilot. What the agents are doing and what needs you, in one place.",
  briefTitle: "Today's AI brief",
  systemsOk: "All systems live",
  patientsToday: "Patients today",
  waitingNow: "Waiting now",
  doneToday: "Seen",
  collectionToday: "Today's income",
  insightsTitle: "Agents noticed",
  open: "Open",
  agentsTitle: "Your AI agents",
  agentsSub: "Live agents work on their own. “Soon” ones are one connection away.",
  hubTitle: "AI services and connections",
  hubSub: "Paid services are fully coded. Add their key and they switch on by themselves.",
  live: "Live",
  connected: "Connected",
  ready: "Soon",
  soon: "Soon",
  connect: "Connect",
  join: "Join",
  hide: "Close",
  readyNote: "The code is ready. Only this is left:",
  soonNote: "Coming soon. It needs:",
  adminOnly: "The clinic admin/owner connects this.",
  cost: "Cost",
  openCenter: "Open AI Command Center",
  insEmpty: "No patients yet today. Share the booking link and QR with patients.",
  insWaiting: (n) => `${n} patients waiting. The queue is moving.`,
  insNoneWaiting: "Nobody waiting. The queue is clear.",
  insMedEnding: (n, names) => `${n} patients' medicine ends within 3 days: ${names}`,
  insFollowUp: (n) => `${n} patients are due for their next visit today.`,
  insMessages: (n) => `${n} reminder messages are ready. Send each with one tap.`,
  insMissed: (n) => `${n} patients missed today. Call them back.`,
  insUnpaid: (n) => `${n} seen patients have no fee recorded yet.`,
  insAllClear: "All done. Nothing pending today.",
  pbTitle: "AI patient brief",
  pbAuto: "Auto brief",
  pbFirstVisit: "First visit.",
  pbVisits: (n, last) => `Visited ${n} times before, last on ${last}.`,
  pbLastDx: (d) => `Last diagnosis: ${d}`,
  pbLastRx: (m) => `Last medicines: ${m}`,
  pbCourse: (end) => `Last medicine course ended ${end}.`,
  pbToday: (c) => `Today's complaint: ${c}`,
  pbAi: "Make AI summary",
  pbAiWorking: "AI is reading...",
  pbAiFailed: "Could not make the AI summary right now. Try again shortly.",
  pbAiOff: "AI summary (Claude) coming soon. Connect →",
  pbAiNote: "AI only assists. The doctor decides.",
  speak: "Speak",
  listening: "Listening... tap to stop",
  voiceUnsupported: "Voice typing does not work in this browser. Use Chrome.",
};

export function getOsWords(lang: Lang): OsWords {
  return lang === "en" ? en : hi;
}
export type { OsWords };

/** The plain-string words a client card needs (functions cannot be passed to the browser). */
export const CARD_WORDS = ["live", "connected", "ready", "soon", "connect", "join", "hide", "readyNote", "soonNote", "adminOnly", "cost"] as const;
export type CardWords = Pick<OsWords, (typeof CARD_WORDS)[number]>;
export function cardWords(w: OsWords): CardWords {
  return Object.fromEntries(CARD_WORDS.map((k) => [k, w[k]])) as CardWords;
}
