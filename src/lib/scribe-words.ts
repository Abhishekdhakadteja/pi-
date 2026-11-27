// Words for the AI Scribe card on the doctor screen (Hindi first, English second).
import type { Lang } from "./i18n";

const hi = {
  title: "AI स्क्राइब · बोलकर पूरी पर्ची",
  lead: "मरीज़ के सामने बस बोलिए। AI शिकायत, दवा, खुराक, दिन और अगली visit अपने आप भर देगा। आप देखकर सेव करें।",
  placeholder: "बोलिए या लिखिए…",
  example: "उदाहरण: \"बुखार 3 दिन से, गला लाल है। Paracetamol 650 दिन में तीन बार खाने के बाद 5 दिन। Azithromycin 500 रात को 3 दिन। 7 दिन बाद दिखाना।\"",
  fill: "✨ AI से पर्ची भरो",
  working: "AI पर्ची भर रहा है…",
  clear: "साफ़ करें",
  done: (n: number) => `✓ ${n} दवाएँ और नोट्स भर दिए। पीले खाने जाँचें, फिर "नोट्स सेव" और "पर्ची सेव" दबाएँ।`,
  doneNoMeds: "✓ नोट्स भर दिए। दवा नहीं मिली; पर्ची में ख़ुद जोड़ें।",
  dropped: "ये नाम आपकी बात में साफ़ नहीं मिले, इसलिए नहीं भरे:",
  noDays: "कुछ दवाओं के दिन नहीं बोले गए, वो खाने ख़ाली हैं।",
  safety: "AI सिर्फ़ वही लिखता है जो आपने बोला। दवा ख़ुद नहीं सुझाता, और आपके सेव किए बिना कुछ सेव नहीं होता। आवाज़ रिकॉर्ड नहीं होती।",
  locked: "AI स्क्राइब Pro में। अनलॉक करें →",
  off: "AI स्क्राइब जल्द आ रहा है।",
  demo: "डेमो में AI बंद रहता है। असली clinic में डॉक्टर बोलते हैं और कुछ सेकंड में पूरी पर्ची भर जाती है।",
  rxBanner: "✨ AI ने भरा है: हर दवा जाँचें, फिर सेव करें।",
  errors: {
    ai_off: "AI अभी चालू नहीं है।",
    ai_failed: "AI से पर्ची नहीं बन पाई। एक बार फिर बोलकर देखें, या हाथ से भरें।",
    ai_budget: "AI अभी बंद है (budget पूरा)। बाकी app चालू है; टीम को ख़बर हो गई है।",
    ai_busy: "AI अभी व्यस्त है। एक मिनट बाद फिर दबाएँ।",
    ai_limit: "आज की AI स्क्राइब सीमा पूरी। पर्ची हाथ से भरें।",
    ai_empty: "कुछ समझ नहीं आया। थोड़ा और साफ़ बोलें।",
  },
};

const en: typeof hi = {
  title: "AI Scribe · speak the whole prescription",
  lead: "Just speak in front of the patient. AI fills the complaint, medicines, dose, days and next visit. You check and save.",
  placeholder: "Speak or type…",
  example: "Example: \"Fever for 3 days, red throat. Paracetamol 650 three times a day after food for 5 days. Azithromycin 500 at night for 3 days. Review after 7 days.\"",
  fill: "✨ Fill prescription with AI",
  working: "AI is filling the prescription…",
  clear: "Clear",
  done: (n: number) => `✓ Filled ${n} medicines and the notes. Check the yellow boxes, then press "Save notes" and "Save prescription".`,
  doneNoMeds: "✓ Notes filled. No medicine found; add it in the prescription yourself.",
  dropped: "These names were not clearly in what you said, so they were not filled:",
  noDays: "Days were not said for some medicines; those boxes are empty.",
  safety: "AI writes only what you said. It never suggests medicines, and nothing is saved until you save it. No audio is recorded.",
  locked: "AI Scribe is in Pro. Unlock →",
  off: "AI Scribe is coming soon.",
  demo: "AI is off in the demo. In a real clinic the doctor speaks and the whole prescription fills in seconds.",
  rxBanner: "✨ Filled by AI: check every medicine, then save.",
  errors: {
    ai_off: "AI is not switched on yet.",
    ai_failed: "AI could not make the prescription. Try speaking once more, or fill it by hand.",
    ai_budget: "AI is paused (budget used up). The rest of the app works; the team has been told.",
    ai_busy: "AI is busy right now. Press again in a minute.",
    ai_limit: "Today's AI Scribe limit is reached. Fill the prescription by hand.",
    ai_empty: "Could not understand that. Please speak a little more clearly.",
  },
};

export type ScribeWords = typeof hi;
export function getScribeWords(lang: Lang): ScribeWords {
  return lang === "en" ? en : hi;
}

/** Browser event that carries an AI draft from the Scribe card to the prescription form. */
export const SCRIBE_EVENT = "ce-scribe";
