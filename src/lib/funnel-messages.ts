// Every WhatsApp message in the doctor journey, in one place (Hindi first, English too).
// Rules we keep: one idea and ONE link per message, the doctor's own name and numbers,
// no fake urgency (only the real offer end date), at most one follow-up after silence, STOP always works.

import { LAUNCH_OFFER_ENDS } from "./plans";
import { inr, PLAN_NAME } from "./funnel";
import type { PlanId } from "./plans";

export type LeadStage =
  | "hello"
  | "checkup"
  | "demo"
  | "webinar"
  | "after_demo"
  | "day1"
  | "day3"
  | "day7"
  | "paid_welcome"
  | "onboard_day1"
  | "onboard_day3"
  | "onboard_day7";

export const LEAD_STAGES: { id: LeadStage; label: string; when: string }[] = [
  { id: "hello", label: "1. पहला जवाब", when: "डॉक्टर ने पहली बार लिखा" },
  { id: "checkup", label: "2. 60 सेकंड क्लिनिक चेकअप", when: "जवाब के तुरंत बाद" },
  { id: "demo", label: "3. 5 मिनट LIVE डेमो", when: "चेकअप पूरा हुआ / DEMO लिखा" },
  { id: "webinar", label: "4. 7 मिनट का वेबिनार", when: "डेमो का समय नहीं" },
  { id: "after_demo", label: "5. डेमो के बाद", when: "डेमो के 1-2 घंटे बाद" },
  { id: "day1", label: "6. अगला दिन", when: "कोई जवाब नहीं, दिन 1" },
  { id: "day3", label: "7. तीसरा दिन (उनका ₹ नंबर)", when: "कोई जवाब नहीं, दिन 3" },
  { id: "day7", label: "8. आख़िरी याद (फिर बंद)", when: "दिन 7, इसके बाद कोई मैसेज नहीं" },
  { id: "paid_welcome", label: "9. भुगतान के बाद स्वागत", when: "प्लान चालू होते ही" },
  { id: "onboard_day1", label: "10. सेटअप दिन 1", when: "भुगतान के अगले दिन" },
  { id: "onboard_day3", label: "11. सेटअप दिन 3", when: "पहले रिमाइंडर" },
  { id: "onboard_day7", label: "12. पहला हफ़्ता पूरा", when: "हफ़्ते की रिपोर्ट" },
];

export function isLeadStage(x: unknown): x is LeadStage {
  return LEAD_STAGES.some((s) => s.id === x);
}

export type LeadVars = { appUrl: string; name?: string; amount?: number; plan?: PlanId };

function dr(name?: string) {
  const n = (name ?? "").trim().replace(/^dr\.?\s*/i, "");
  return n ? `Dr. ${n}` : "Doctor";
}

function endLabel() {
  return new Date(`${LAUNCH_OFFER_ENDS}T00:00:00+05:30`).toLocaleDateString("hi-IN", { day: "numeric", month: "long", timeZone: "Asia/Kolkata" });
}

export function leadMessage(stage: LeadStage, v: LeadVars): string {
  const app = v.appUrl.replace(/\/$/, "");
  const name = dr(v.name);
  const plan = PLAN_NAME[v.plan ?? "pro"];
  switch (stage) {
    case "hello":
      return `नमस्ते ${name} 🙏\nमैं Clinic Easy AI से हूँ।\n\nएक सवाल: आपकी clinic में रोज़ कितना समय रजिस्टर, पर्ची और हिसाब में जाता है? ⏳\n\nहम वही समय आपको वापस देते हैं, ताकि आप सिर्फ़ इलाज पर ध्यान दें।\n\n👉 60 सेकंड का मुफ़्त क्लिनिक चेकअप: ${app}/start?ref=wa`;
    case "checkup":
      return `${name}, 60 सेकंड का एक छोटा सा चेकअप आपकी clinic का 🩺\n\n3 टैप में पता चलेगा:\n✅ हर महीने कितने follow-up मरीज़ लौटकर नहीं आते\n✅ उनसे कितना ₹ छूट रहा है\n✅ आपकी clinic के लिए कौन सा प्लान सही है\n\n${app}/start?ref=wa`;
    case "demo":
      return `${name}, अब ख़ुद चलाकर देखिए ✨\n\n5 मिनट का LIVE डेमो, बिना पासवर्ड, बिना रजिस्ट्रेशन:\n${app}/demo?ref=wa\n\n🩺 डॉक्टर की नज़र से: आज के मरीज़, पर्ची, कमाई\n🧾 रिसेप्शन की नज़र से: टोकन, लिस्ट, 1-टैप रिमाइंडर\n\n5 मिनट बाद डेमो अपने आप बंद हो जाता है।`;
    case "webinar":
      return `${name}, अभी डेमो चलाने का समय नहीं? 🙂\n\n7 मिनट का वेबिनार देखिए, जो अपने आप चलता है और आवाज़ में भी सुन सकते हैं:\nएक डॉक्टर का पूरा दिन, सुबह 9 से रात 9 तक, Clinic Easy AI के साथ।\n\n▶ ${app}/webinar?ref=wa`;
    case "after_demo":
      return `${name}, डेमो कैसा लगा? 😊\n\nसबसे ज़्यादा क्या अच्छा लगा:\n1️⃣ टोकन और आज की लिस्ट\n2️⃣ पर्ची और follow-up रिमाइंडर\n3️⃣ दिन / महीने का हिसाब\n\nबस नंबर लिखकर भेजिए, मैं बता दूँगा कि आपकी clinic में उसे पहले दिन से कैसे चालू करें।`;
    case "day1":
      return `${name}, एक छोटी सी बात 💡\n\nज़्यादातर मरीज़ इलाज बीच में इसलिए नहीं छोड़ते कि दवा काम नहीं कर रही, बल्कि इसलिए कि वो तारीख़ भूल जाते हैं।\n\nClinic Easy दवा ख़त्म होने और अगली visit से पहले मरीज़ को WhatsApp पर याद दिलाता है, आपके नाम से।\n\nमरीज़ की सेहत बेहतर, और आपकी clinic पर भरोसा ज़्यादा 🙏\n\nदेखिए कैसे: ${app}/demo?ref=day1`;
    case "day3":
      return v.amount && v.amount > 0
        ? `${name}, आपके चेकअप का नतीजा याद है? 📊\n\nअनुमान: हर महीने लगभग *${inr(v.amount)}* के follow-up मरीज़ लौटकर नहीं आते।\n\n${plan} का पहला महीना इससे कहीं कम में आता है। आप चाहें तो आज ही चालू करवा दें, 10 मिनट लगते हैं।\n\n👉 "हाँ" लिखिए, या प्लान देखिए: ${app}/pricing`
        : `${name}, 60 सेकंड में जानिए आपकी clinic हर महीने कितना ₹ और कितने घंटे खो रही है 📊\n\n${app}/start?ref=day3\n\nनतीजा सिर्फ़ आपको दिखेगा, हमें कोई नंबर नहीं चाहिए।`;
    case "day7":
      return `${name}, ये मेरा आख़िरी मैसेज है, वादा 🙏\n\nलॉन्च ऑफ़र ${endLabel()} तक है: AI Pro का पहला महीना ₹499 (+GST)।\n\nअगर अभी सही समय नहीं है तो कोई बात नहीं। जब भी clinic को आसान बनाना हो, बस "Hi" लिख दीजिए।\n\nआपके मरीज़ों के लिए शुभकामनाएँ 🩺`;
    case "paid_welcome":
      return `🎉 स्वागत है ${name}! Clinic Easy ${plan} आपकी clinic पर चालू हो गया है।\n\n✅ लॉगिन: ${app}/login\n✅ स्टाफ़ को 5 मिनट का डेमो पहले दिखाएँ: ${app}/demo?ref=welcome\n\nअगले 7 दिन मैं हर क़दम पर आपके साथ हूँ। कोई भी सवाल हो तो यहीं लिखिए 🙏`;
    case "onboard_day1":
      return `गुड मॉर्निंग ${name} ☀️\n\nआज का एक काम (2 मिनट):\nअपने रिसेप्शन वाले को जोड़िए: Settings → Staff → नया स्टाफ़।\n\nफिर आज के मरीज़ वही डालेगा, और आप सिर्फ़ "अगला मरीज़" दबाएँगे 👨‍⚕️`;
    case "onboard_day3":
      return `${name}, 3 दिन हो गए 👏\n\nआज "Messages" पेज खोलिए। वहाँ वो मरीज़ दिखेंगे जिनकी दवा ख़त्म हो रही है या अगली visit आ रही है।\n\nहर नाम पर एक टैप, और WhatsApp पर रिमाइंडर चला जाएगा। यही आपके लौटकर आने वाले मरीज़ हैं 💚`;
    case "onboard_day7":
      return `${name}, आपका पहला हफ़्ता पूरा 🎯\n\n"Reports" खोलकर देखिए: इस हफ़्ते के मरीज़, कमाई और ख़र्च, सब एक जगह।\n\nकुछ भी बदलवाना हो या कोई नया फ़ीचर चाहिए, बस लिखिए। आपकी clinic, आपके हिसाब से 🙏`;
  }
}
