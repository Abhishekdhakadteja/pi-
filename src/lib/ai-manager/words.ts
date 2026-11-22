// Words for the AI मैनेजर chat panel, in both languages. Client-safe.

import type { Lang } from "@/lib/i18n";
import type { Role } from "@/lib/staff";

const hi = {
  open: "AI मैनेजर",
  title: "AI मैनेजर",
  sub: "क्लिनिक के बारे में कुछ भी पूछें। अभी सिर्फ़ जवाब देता है, कोई बदलाव नहीं करता।",
  placeholder: "जैसे: आज कितने मरीज़ बाकी हैं?",
  send: "पूछें",
  thinking: "देख रहा हूँ...",
  close: "बंद करें",
  clear: "नई बातचीत",
  tryThese: "ये पूछकर देखें",
  privacy: "AI को मरीज़ का पूरा मोबाइल नंबर और पता नहीं भेजा जाता। AI गलती कर सकता है, ज़रूरी बातें जाँच लें।",
  err: {
    not_allowed: "दोबारा लॉगिन करें।",
    ai_off: "AI अभी कनेक्ट नहीं है। AI पेज पर Claude की key जोड़ें।",
    pro: "AI मैनेजर Clinic Easy Pro में है।",
    limit: "आज की AI सवालों की सीमा पूरी हो गई। कल फिर पूछें।",
    empty: "पहले सवाल लिखें या बोलें।",
    failed: "जवाब नहीं आ पाया। थोड़ी देर बाद फिर पूछें।",
    budget: "AI अभी बंद है (budget पूरा)। बाकी app पहले जैसा चलता रहेगा; Clinic Easy टीम को अपने आप ख़बर हो गई है।",
    busy: "AI पर अभी भीड़ है। 1-2 मिनट बाद फिर पूछें।",
  },
  unlock: "Pro अनलॉक करें →",
  connect: "कनेक्ट करें →",
  lockedTitle: "AI मैनेजर",
  lockedPro: "पूरे क्लिनिक का AI मैनेजर: बोलकर पूछिए, तुरंत जवाब। Clinic Easy Pro में शामिल।",
  lockedKey: "AI मैनेजर के लिए Claude AI कनेक्ट करना होगा।",
};

type Words = typeof hi;

const en: Words = {
  open: "AI Manager",
  title: "AI Manager",
  sub: "Ask anything about your clinic. For now it only answers; it does not change anything.",
  placeholder: "e.g. How many patients are still waiting?",
  send: "Ask",
  thinking: "Looking it up...",
  close: "Close",
  clear: "New chat",
  tryThese: "Try asking",
  privacy: "Full mobile numbers and addresses are never sent to the AI. AI can make mistakes; check what matters.",
  err: {
    not_allowed: "Please log in again.",
    ai_off: "AI is not connected yet. Add the Claude key on the AI page.",
    pro: "AI Manager is part of Clinic Easy Pro.",
    limit: "Today's AI question limit is reached. Ask again tomorrow.",
    empty: "Type or speak a question first.",
    failed: "Could not get an answer. Please try again in a moment.",
    budget: "AI is paused right now (budget used up). The rest of the app works as usual; the Clinic Easy team has been told automatically.",
    busy: "AI is busy right now. Ask again in a minute or two.",
  },
  unlock: "Unlock Pro →",
  connect: "Connect →",
  lockedTitle: "AI Manager",
  lockedPro: "An AI manager for the whole clinic: ask by voice, get answers instantly. Included in Clinic Easy Pro.",
  lockedKey: "Connect Claude AI to use the AI Manager.",
};

export function getManagerWords(lang: Lang): Words {
  return lang === "en" ? en : hi;
}

/** Starter questions shown in an empty chat, by role. */
export const SUGGESTIONS: Record<Lang, Record<Role, string[]>> = {
  hi: {
    attender: ["आज कितने मरीज़ बाकी हैं?", "अगला टोकन किसका है?", "आज कितने मरीज़ नहीं आए?"],
    doctor: ["आज के मरीज़ों में किसकी तकलीफ़ क्या है?", "इस हफ़्ते की कमाई और खर्च बताओ", "इस हफ़्ते किन मरीज़ों का दोबारा आना बाकी है?"],
    admin: ["इस महीने का मुनाफ़ा कितना है?", "आज UPI और कैश में कितना आया?", "हमारे स्टाफ़ में कौन-कौन है?"],
  },
  en: {
    attender: ["How many patients are still waiting today?", "Whose token is next?", "How many patients missed today?"],
    doctor: ["What are today's patients coming in for?", "Show this week's income and expenses", "Who is due for a follow-up this week?"],
    admin: ["What is this month's profit?", "How much came in by UPI and cash today?", "Who is on our staff?"],
  },
};
