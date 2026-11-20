// Public "find a doctor" helper: maps what a common person types (Hindi, Hinglish or English)
// to the KIND of specialist to see. This is NOT a diagnosis: it only says which doctor to visit.
// Pure data + functions, no server code, so it is shared by pages and unit tests.

import type { Lang } from "@/lib/i18n";

export type SpecialtyId =
  | "general"
  | "ortho"
  | "cardio"
  | "skin"
  | "dental"
  | "gynae"
  | "child"
  | "ent"
  | "eye"
  | "neuro"
  | "gastro"
  | "chest"
  | "diabetes"
  | "kidney"
  | "mind"
  | "physio";

export type Specialty = {
  id: SpecialtyId;
  emoji: string;
  hi: string;
  en: string;
  /** Who this doctor is, in one plain line. */
  hiAbout: string;
  enAbout: string;
  /** English words Google Maps understands, used for the search. */
  query: string;
  /** Lower-case words people type. Hindi (Devanagari), Hinglish and English. */
  words: string[];
};

export const SPECIALTIES: Specialty[] = [
  {
    id: "general",
    emoji: "🩺",
    hi: "सामान्य डॉक्टर (फिजिशियन)",
    en: "General physician",
    hiAbout: "बुखार, सर्दी-खांसी, कमजोरी, BP, शुरुआती जाँच",
    enAbout: "Fever, cold, weakness, BP, first check-up",
    query: "general physician",
    words: ["बुखार", "सर्दी", "जुकाम", "कमजोरी", "थकान", "बदन दर्द", "उल्टी", "दस्त", "बीपी", "ब्लड प्रेशर", "टाइफाइड", "मलेरिया", "डेंगू", "bukhar", "fever", "cold", "flu", "weakness", "tired", "body pain", "bp", "blood pressure", "typhoid", "malaria", "dengue", "physician", "general"],
  },
  {
    id: "ortho",
    emoji: "🦴",
    hi: "हड्डी रोग विशेषज्ञ",
    en: "Orthopedic (bone) doctor",
    hiAbout: "हड्डी, जोड़, घुटना, कमर, फ्रैक्चर, मोच",
    enAbout: "Bones, joints, knee, back, fracture, sprain",
    query: "orthopedic doctor",
    words: ["हड्डी", "जोड़", "घुटना", "घुटने", "कमर दर्द", "कमर", "पीठ", "फ्रैक्चर", "मोच", "गठिया", "कंधा", "गर्दन दर्द", "haddi", "jod", "ghutna", "kamar", "bone", "joint", "knee", "back pain", "fracture", "sprain", "arthritis", "shoulder", "neck pain", "ortho", "orthopedic", "orthopaedic"],
  },
  {
    id: "cardio",
    emoji: "❤️",
    hi: "हृदय रोग विशेषज्ञ",
    en: "Cardiologist (heart)",
    hiAbout: "दिल, सीने में दर्द, धड़कन तेज, हार्ट अटैक के बाद",
    enAbout: "Heart, chest pain, fast heartbeat, after a heart attack",
    query: "cardiologist",
    words: ["दिल", "हृदय", "हार्ट", "सीने", "छाती में दर्द", "छाती में तेज", "धड़कन", "घबराहट", "dil", "heart", "chest pain", "palpitation", "heartbeat", "cardio", "cardiologist", "cholesterol", "कोलेस्ट्रॉल"],
  },
  {
    id: "skin",
    emoji: "🧴",
    hi: "त्वचा (चर्म) रोग विशेषज्ञ",
    en: "Dermatologist (skin)",
    hiAbout: "खाज-खुजली, दाद, मुंहासे, एलर्जी, बाल झड़ना",
    enAbout: "Itching, ringworm, acne, rash, hair fall",
    query: "dermatologist skin doctor",
    words: ["खाज", "खुजली", "दाद", "त्वचा", "चमड़ी", "मुंहासे", "दाने", "एलर्जी", "बाल झड़", "सफेद दाग", "फोड़ा", "khujli", "khaj", "daad", "skin", "itching", "itch", "rash", "acne", "pimple", "ringworm", "allergy", "hair fall", "dandruff", "eczema", "psoriasis", "dermatologist"],
  },
  {
    id: "dental",
    emoji: "🦷",
    hi: "दांत के डॉक्टर",
    en: "Dentist",
    hiAbout: "दांत दर्द, कीड़ा, मसूड़े, दांत लगवाना, सफाई",
    enAbout: "Toothache, cavity, gums, braces, cleaning",
    query: "dentist dental clinic",
    words: ["दांत", "दाँत", "दाढ़", "मसूड़", "कीड़ा", "daant", "dant", "tooth", "teeth", "toothache", "cavity", "gum", "braces", "dentist", "dental", "root canal"],
  },
  {
    id: "gynae",
    emoji: "🤰",
    hi: "स्त्री एवं प्रसूति रोग विशेषज्ञ",
    en: "Gynecologist (women, pregnancy)",
    hiAbout: "गर्भावस्था, डिलीवरी, माहवारी, महिलाओं की बीमारी",
    enAbout: "Pregnancy, delivery, periods, women's health",
    query: "gynecologist",
    words: ["गर्भ", "प्रेगनेंसी", "प्रसव", "डिलीवरी", "माहवारी", "पीरियड", "महिला", "औरतों", "बच्चेदानी", "pregnancy", "pregnant", "delivery", "period", "periods", "pcod", "pcos", "women", "gynae", "gyne", "gynecologist", "gynaecologist", "prasav"],
  },
  {
    id: "child",
    emoji: "🧒",
    hi: "शिशु एवं बाल रोग विशेषज्ञ",
    en: "Pediatrician (children)",
    hiAbout: "बच्चों का बुखार, टीके, बढ़त, नवजात शिशु",
    enAbout: "Children's fever, vaccines, growth, newborns",
    query: "pediatrician child specialist",
    words: ["बच्चा", "बच्चे", "बच्चों", "शिशु", "नवजात", "टीका", "टीकाकरण", "bachcha", "bacche", "child", "children", "baby", "kid", "newborn", "vaccine", "vaccination", "pediatrician", "paediatrician"],
  },
  {
    id: "ent",
    emoji: "👂",
    hi: "नाक-कान-गला विशेषज्ञ (ENT)",
    en: "ENT (ear, nose, throat)",
    hiAbout: "कान दर्द, कम सुनना, गला खराब, टॉन्सिल, साइनस",
    enAbout: "Ear pain, hearing, sore throat, tonsils, sinus",
    query: "ENT specialist",
    words: ["कान", "नाक", "गला", "गले", "टॉन्सिल", "साइनस", "कम सुनाई", "kaan", "naak", "gala", "ear", "nose", "throat", "tonsil", "sinus", "hearing", "ent"],
  },
  {
    id: "eye",
    emoji: "👁️",
    hi: "नेत्र रोग विशेषज्ञ",
    en: "Eye specialist",
    hiAbout: "आँख, चश्मा, मोतियाबिंद, धुंधला दिखना",
    enAbout: "Eyes, glasses, cataract, blurred vision",
    query: "eye specialist ophthalmologist",
    words: ["आँख", "आंख", "चश्मा", "मोतियाबिंद", "धुंधला", "aankh", "ankh", "eye", "eyes", "vision", "cataract", "glasses", "spectacles", "ophthalmologist"],
  },
  {
    id: "neuro",
    emoji: "🧠",
    hi: "न्यूरो (दिमाग व नस) विशेषज्ञ",
    en: "Neurologist (brain, nerves)",
    hiAbout: "बार-बार सिर दर्द, दौरे/मिर्गी, लकवा, सुन्नपन",
    enAbout: "Repeated headache, fits, paralysis, numbness",
    query: "neurologist",
    words: ["सिर दर्द", "सिरदर्द", "माइग्रेन", "मिर्गी", "दौरा", "दौरे", "लकवा", "सुन्न", "चक्कर", "नस", "sir dard", "headache", "migraine", "epilepsy", "fits", "seizure", "paralysis", "numbness", "dizziness", "nerve", "neurologist"],
  },
  {
    id: "gastro",
    emoji: "🫃",
    hi: "पेट रोग विशेषज्ञ",
    en: "Gastroenterologist (stomach)",
    hiAbout: "पेट दर्द, गैस, एसिडिटी, कब्ज, लीवर, पीलिया",
    enAbout: "Stomach pain, gas, acidity, constipation, liver, jaundice",
    query: "gastroenterologist",
    words: ["पेट", "गैस", "एसिडिटी", "कब्ज", "लीवर", "पीलिया", "बवासीर", "pet", "stomach", "gas", "acidity", "constipation", "liver", "jaundice", "piles", "gastro", "gastroenterologist"],
  },
  {
    id: "chest",
    emoji: "🫁",
    hi: "छाती व सांस रोग विशेषज्ञ",
    en: "Chest & lung specialist",
    hiAbout: "लंबी खांसी, दमा, सांस फूलना, टीबी",
    enAbout: "Long cough, asthma, breathlessness, TB",
    query: "chest physician pulmonologist",
    words: ["खांसी", "खाँसी", "दमा", "सांस", "साँस", "फेफड़", "टीबी", "khansi", "dama", "saans", "cough", "asthma", "breathing", "breathless", "lungs", "tb", "tuberculosis", "pulmonologist"],
  },
  {
    id: "diabetes",
    emoji: "🩸",
    hi: "शुगर / थायराइड विशेषज्ञ",
    en: "Diabetes & thyroid specialist",
    hiAbout: "शुगर (मधुमेह), थायराइड, हार्मोन, मोटापा",
    enAbout: "Sugar (diabetes), thyroid, hormones, obesity",
    query: "diabetologist endocrinologist",
    words: ["शुगर", "मधुमेह", "डायबिटीज", "थायराइड", "हार्मोन", "मोटापा", "sugar", "diabetes", "diabetic", "thyroid", "hormone", "obesity", "diabetologist", "endocrinologist"],
  },
  {
    id: "kidney",
    emoji: "🫘",
    hi: "किडनी व पेशाब रोग विशेषज्ञ",
    en: "Kidney & urine specialist",
    hiAbout: "पथरी, पेशाब में जलन, किडनी, प्रोस्टेट",
    enAbout: "Stones, burning urine, kidney, prostate",
    query: "urologist nephrologist",
    words: ["पथरी", "पेशाब", "किडनी", "गुर्दा", "प्रोस्टेट", "pathri", "peshab", "kidney", "stone", "urine", "urinary", "prostate", "urologist", "nephrologist"],
  },
  {
    id: "mind",
    emoji: "🧘",
    hi: "मानसिक स्वास्थ्य विशेषज्ञ",
    en: "Mental health (psychiatrist)",
    hiAbout: "तनाव, नींद न आना, उदासी, घबराहट, नशा छुड़ाना",
    enAbout: "Stress, no sleep, sadness, anxiety, addiction",
    query: "psychiatrist",
    words: ["तनाव", "टेंशन", "नींद नहीं", "उदासी", "डिप्रेशन", "चिंता", "नशा", "tension", "stress", "sleep", "insomnia", "depression", "sad", "anxiety", "addiction", "psychiatrist", "mental"],
  },
  {
    id: "physio",
    emoji: "🏃",
    hi: "फिजियोथेरेपिस्ट",
    en: "Physiotherapist",
    hiAbout: "कसरत से इलाज, चोट के बाद, जकड़न, लकवे के बाद",
    enAbout: "Exercise therapy, after injury, stiffness, after stroke",
    query: "physiotherapist",
    words: ["फिजियो", "कसरत", "जकड़न", "physio", "physiotherapy", "physiotherapist", "stiffness", "exercise therapy"],
  },
];

export const SPECIALTY_BY_ID: Record<SpecialtyId, Specialty> = Object.fromEntries(SPECIALTIES.map((s) => [s.id, s])) as Record<
  SpecialtyId,
  Specialty
>;

export function isSpecialtyId(v: unknown): v is SpecialtyId {
  return typeof v === "string" && v in SPECIALTY_BY_ID;
}

export function specialtyName(id: SpecialtyId, lang: Lang): string {
  const s = SPECIALTY_BY_ID[id];
  return lang === "hi" ? s.hi : s.en;
}

/** Signs that need emergency care, not an appointment. */
const EMERGENCY_WORDS = [
  "सीने में तेज दर्द",
  "छाती में तेज दर्द",
  "सांस नहीं",
  "साँस नहीं",
  "बेहोश",
  "लकवा",
  "मुंह टेढ़ा",
  "बहुत खून",
  "खून की उल्टी",
  "जहर",
  "आत्महत्या",
  "हार्ट अटैक",
  "severe chest pain",
  "heart attack",
  "can't breathe",
  "cannot breathe",
  "not breathing",
  "unconscious",
  "fainted",
  "stroke",
  "heavy bleeding",
  "vomiting blood",
  "poison",
  "suicide",
  "accident",
  "एक्सीडेंट",
  "दुर्घटना",
];

export function isEmergency(text: string): boolean {
  const q = normalize(text);
  return q.length > 0 && EMERGENCY_WORDS.some((w) => q.includes(normalize(w)));
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Returns the specialties whose words appear in the text, best match first (most matched words,
 * then longest word). Empty text gives []. Unknown text gives [] (the page then suggests a
 * general physician).
 */
export function matchSpecialties(text: string, max = 3): SpecialtyId[] {
  const q = normalize(text);
  if (!q) return [];
  const scored: { id: SpecialtyId; hits: number; longest: number }[] = [];
  for (const s of SPECIALTIES) {
    let hits = 0;
    let longest = 0;
    for (const w of s.words) {
      if (matchesWord(q, normalize(w))) {
        hits++;
        longest = Math.max(longest, w.length);
      }
    }
    if (hits > 0) scored.push({ id: s.id, hits, longest });
  }
  // On a tie the specific doctor wins over the general physician ("बच्चे को बुखार" -> child doctor).
  const general = (id: SpecialtyId) => (id === "general" ? 1 : 0);
  scored.sort((a, b) => b.hits - a.hits || general(a.id) - general(b.id) || b.longest - a.longest);
  return scored.slice(0, max).map((s) => s.id);
}

/** Latin words (like "ent", "tb") must match whole words; Hindi words match anywhere. */
function matchesWord(q: string, w: string): boolean {
  if (/^[a-z ]+$/.test(w) && w.length <= 4) {
    return new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(q);
  }
  return q.includes(w);
}
