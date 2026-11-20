// "मेरा दिन": a free, rule-based daily routine for common people (the "systematic" mode).
// Pure function, no network: the plan is made on the phone and saved only in the browser.
// The advice is general healthy-habit guidance, never treatment. Medicines are shown only as the
// person typed them ("as your doctor told you"), we never suggest a medicine or a dose.

import type { Lang } from "@/lib/i18n";

export type GoalId = "weight" | "sugar" | "bp" | "fitness" | "sleep" | "stress" | "study" | "senior" | "water";
export const GOALS: { id: GoalId; emoji: string; hi: string; en: string }[] = [
  { id: "weight", emoji: "⚖️", hi: "वजन कम करना", en: "Lose weight" },
  { id: "sugar", emoji: "🩸", hi: "शुगर कंट्रोल", en: "Control sugar" },
  { id: "bp", emoji: "❤️", hi: "BP कंट्रोल", en: "Control BP" },
  { id: "fitness", emoji: "💪", hi: "फिटनेस / ताकत", en: "Fitness / strength" },
  { id: "sleep", emoji: "😴", hi: "अच्छी नींद", en: "Better sleep" },
  { id: "stress", emoji: "🧘", hi: "तनाव कम", en: "Less stress" },
  { id: "study", emoji: "📚", hi: "पढ़ाई / फोकस", en: "Study / focus" },
  { id: "senior", emoji: "👴", hi: "बुज़ुर्ग देखभाल", en: "Senior care" },
  { id: "water", emoji: "💧", hi: "पानी पीने की आदत", en: "Drink more water" },
];

export type MedSlot = "morning" | "noon" | "night";
export type Medicine = { name: string; slots: MedSlot[] };

export type RoutineInput = {
  wake: string; // "06:00"
  sleep: string; // "22:30"
  work: { start: string; end: string } | null;
  goals: GoalId[];
  diet: "veg" | "nonveg";
  medicines: Medicine[];
};

export type Kind = "body" | "food" | "med" | "mind" | "work" | "water" | "sleep";
export type RoutineItem = { time: string; kind: Kind; title: string; note?: string };

type T = { hi: string; en: string };
const pick = (t: T, lang: Lang) => (lang === "hi" ? t.hi : t.en);

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export function isTime(v: unknown): v is string {
  return typeof v === "string" && TIME.test(v);
}
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toTime = (m: number) => {
  const x = ((Math.round(m / 5) * 5) % 1440 + 1440) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
};

/** Minutes awake, handling a sleep time after midnight. */
function dayLength(wake: number, sleep: number): number {
  return sleep > wake ? sleep - wake : sleep + 1440 - wake;
}

export function buildRoutine(input: RoutineInput, lang: Lang): RoutineItem[] {
  const wake = toMin(isTime(input.wake) ? input.wake : "06:00");
  let sleepAbs = toMin(isTime(input.sleep) ? input.sleep : "22:00");
  if (sleepAbs <= wake) sleepAbs += 1440; // sleeps after midnight
  const awake = dayLength(wake, sleepAbs % 1440);
  const g = new Set(input.goals);
  const items: { at: number; kind: Kind; title: T; note?: T }[] = [];
  const add = (at: number, kind: Kind, title: T, note?: T) => items.push({ at, kind, title, note });

  const work =
    input.work && isTime(input.work.start) && isTime(input.work.end)
      ? { s: toMin(input.work.start) < wake ? toMin(input.work.start) + 1440 : toMin(input.work.start), e: 0 }
      : null;
  if (work && input.work) {
    work.e = toMin(input.work.end);
    while (work.e <= work.s) work.e += 1440;
  }
  const busy = (m: number) => !!work && m >= work.s && m < work.e;

  // ---- wake up
  add(wake, "body", { hi: "उठें, 1-2 गिलास गुनगुना पानी पिएं", en: "Wake up, drink 1-2 glasses of lukewarm water" }, g.has("sleep")
    ? { hi: "रोज़ एक ही समय पर उठें, छुट्टी के दिन भी", en: "Same time every day, holidays too" }
    : undefined);
  add(wake + 10, "body", { hi: "मुँह-हाथ धोएं, 5 मिनट धूप/खुली हवा", en: "Freshen up, 5 minutes of sunlight / fresh air" });

  // ---- morning movement (before work if there is time)
  const moveMin = g.has("fitness") ? 45 : g.has("weight") || g.has("sugar") ? 40 : g.has("senior") ? 20 : 30;
  // Early shift? Move the exercise to after work.
  const morningFree = !busy(wake + 20) && !busy(wake + 20 + moveMin);
  const moveAt = morningFree || !work ? wake + 20 : work.e + 30;
  const moveTitle: T = g.has("senior")
    ? { hi: `${moveMin} मिनट हल्का योग / स्ट्रेचिंग`, en: `${moveMin} min gentle yoga / stretching` }
    : g.has("fitness")
      ? { hi: `${moveMin} मिनट कसरत (वॉक/दौड़ + बॉडी वेट)`, en: `${moveMin} min workout (walk/run + bodyweight)` }
      : { hi: `${moveMin} मिनट तेज़ चाल से टहलना`, en: `${moveMin} min brisk walk` };
  add(moveAt, "body", moveTitle, g.has("senior") ? { hi: "किसी के साथ चलें, फिसलन से बचें", en: "Walk with someone, avoid slippery paths" } : undefined);
  if (g.has("stress") || g.has("bp")) {
    add(moveAt + moveMin + 5, "mind", { hi: "10 मिनट प्राणायाम / गहरी सांस", en: "10 min pranayama / deep breathing" });
  }
  if (g.has("bp")) add(moveAt + moveMin + 20, "body", { hi: "BP नापें और लिखें (अगर मशीन है)", en: "Check BP and note it (if you have a machine)" });
  if (g.has("sugar")) add(wake + 5, "body", { hi: "खाली पेट शुगर जाँच (अगर डॉक्टर ने कहा है)", en: "Fasting sugar check (if your doctor asked)" });

  // ---- meals
  const breakfast = morningFree ? Math.max(wake + 75, moveAt + moveMin + 30) : wake + 45;
  const lunch = Math.max(breakfast + 240, wake + 360);
  const dinner = Math.max(lunch + 300, sleepAbs - 180);
  const veg = input.diet === "veg";
  add(breakfast, "food", { hi: "नाश्ता", en: "Breakfast" }, g.has("fitness")
    ? { hi: veg ? "प्रोटीन: दूध/दही/पनीर/अंकुरित चना" : "प्रोटीन: अंडा/दूध/दही/अंकुरित चना", en: veg ? "Protein: milk/curd/paneer/sprouts" : "Protein: eggs/milk/curd/sprouts" }
    : g.has("sugar") || g.has("weight")
      ? { hi: "मीठा और मैदा कम, दलिया/पोहा/अंकुरित अनाज", en: "Less sugar and maida; daliya/poha/sprouts" }
      : undefined);
  add(lunch, "food", { hi: "दोपहर का खाना", en: "Lunch" }, {
    hi: "आधी थाली सब्ज़ी/सलाद, दाल, रोटी" + (g.has("bp") ? ", ऊपर से नमक नहीं" : ""),
    en: "Half plate vegetables/salad, dal, roti" + (g.has("bp") ? ", no extra salt" : ""),
  });
  if (g.has("sugar") || g.has("weight")) {
    add(lunch + 20, "body", { hi: "खाने के बाद 10 मिनट टहलें", en: "10 minute walk after the meal" });
  }
  add(lunch + 210, "food", { hi: "शाम का हल्का नाश्ता", en: "Light evening snack" }, {
    hi: "फल, भुना चना या मुट्ठी भर मेवा" + (g.has("sleep") ? "; 4 बजे के बाद चाय-कॉफी नहीं" : ""),
    en: "Fruit, roasted chana or a handful of nuts" + (g.has("sleep") ? "; no tea/coffee after 4 pm" : ""),
  });
  add(dinner, "food", { hi: "रात का खाना (हल्का)", en: "Dinner (light)" }, { hi: "सोने से 2-3 घंटे पहले खा लें", en: "Eat 2-3 hours before sleep" });
  add(dinner + 20, "body", { hi: "10-15 मिनट टहलें", en: "Walk 10-15 minutes" });

  // ---- work block + breaks
  if (work) {
    add(work.s, "work", { hi: "काम / ड्यूटी शुरू", en: "Work starts" }, { hi: "हर घंटे 2 मिनट उठें, आँखों को आराम दें", en: "Stand up 2 minutes every hour, rest your eyes" });
    add(work.e, "work", { hi: "काम खत्म", en: "Work ends" });
  }

  // ---- study blocks in free time
  if (g.has("study")) {
    const slots = [wake + 120, lunch + 90, dinner - 150, dinner + 45].filter((m) => !busy(m) && m < sleepAbs - 60);
    slots.slice(0, 3).forEach((m, i) =>
      add(m, "work", { hi: `पढ़ाई ब्लॉक ${i + 1}: 50 मिनट पढ़ें + 10 मिनट आराम`, en: `Study block ${i + 1}: 50 min focus + 10 min break` }, { hi: "फोन दूसरे कमरे में रखें", en: "Keep the phone in another room" }),
    );
  }

  // ---- water every ~2 hours
  if (g.has("water") || g.has("weight") || g.has("sugar")) {
    for (let m = wake + 120; m < sleepAbs - 90; m += 120) add(m, "water", { hi: "1 गिलास पानी", en: "1 glass of water" });
  }

  // ---- mind
  if (g.has("stress")) add(dinner + 45, "mind", { hi: "परिवार के साथ समय, फोन बंद", en: "Family time, phone away" });
  if (g.has("senior")) add(lunch + 60, "sleep", { hi: "30-45 मिनट आराम", en: "Rest 30-45 minutes" });

  // ---- medicines: only what the person typed
  const medAt: Record<MedSlot, number> = { morning: breakfast + 15, noon: lunch + 15, night: dinner + 15 };
  for (const med of input.medicines.slice(0, 10)) {
    const name = med.name.trim().slice(0, 60);
    if (!name) continue;
    for (const s of med.slots) {
      if (!(s in medAt)) continue;
      add(medAt[s], "med", { hi: `दवा: ${name}`, en: `Medicine: ${name}` }, { hi: "डॉक्टर ने जैसा बताया वैसे ही लें", en: "Take exactly as your doctor told you" });
    }
  }

  // ---- night
  add(sleepAbs - 60, "sleep", { hi: "स्क्रीन बंद, हल्की रोशनी", en: "Screens off, dim lights" }, g.has("sleep") ? { hi: "किताब पढ़ें या हल्का संगीत", en: "Read or listen to soft music" } : undefined);
  if (g.has("sugar")) add(sleepAbs - 45, "body", { hi: "पैरों को देखें (कट/छाले)", en: "Check your feet (cuts/blisters)" });
  if (g.has("stress") || g.has("sleep")) add(sleepAbs - 30, "mind", { hi: "आज की 3 अच्छी बातें लिखें", en: "Write 3 good things about today" });
  add(sleepAbs, "sleep", { hi: "सो जाएं", en: "Sleep" }, awake > 17 * 60 ? { hi: "7-8 घंटे की नींद ज़रूरी है", en: "7-8 hours of sleep is important" } : undefined);

  return items
    .filter((i) => i.at >= wake && i.at <= sleepAbs)
    .filter((i) => i.kind !== "body" && i.kind !== "mind" && i.kind !== "sleep" ? true : !busy(i.at))
    .sort((a, b) => a.at - b.at)
    .map((i) => ({ time: toTime(i.at), kind: i.kind, title: pick(i.title, lang), note: i.note ? pick(i.note, lang) : undefined }));
}

/** A calendar file: each item becomes a daily repeating event with a reminder at its time. */
export function routineToIcs(items: RoutineItem[], startDate: Date): string {
  const ymd = `${startDate.getFullYear()}${String(startDate.getMonth() + 1).padStart(2, "0")}${String(startDate.getDate()).padStart(2, "0")}`;
  const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Clinic Easy//Mera Din//HI", "CALSCALE:GREGORIAN"];
  items.forEach((it, i) => {
    const hm = it.time.replace(":", "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:clinic-easy-routine-${ymd}-${i}@clinic-easy`,
      `DTSTAMP:${ymd}T000000`,
      `DTSTART;TZID=Asia/Kolkata:${ymd}T${hm}00`,
      "DURATION:PT10M",
      "RRULE:FREQ=DAILY",
      `SUMMARY:${esc(it.title)}`,
      ...(it.note ? [`DESCRIPTION:${esc(it.note)}`] : []),
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(it.title)}`,
      "TRIGGER:PT0M",
      "END:VALARM",
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
