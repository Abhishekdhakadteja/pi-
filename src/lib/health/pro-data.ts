// Patient Pro ("Clinic Easy Health Pro"): the data model and the rules behind its tools.
// Everything is stored on the person's own phone (localStorage), never on our server, so the
// plan costs us almost nothing to run and private health data does not leave the device.
// Pure functions only: shared by the app screens and the unit tests.

export type VitalType = "bp" | "sugar_fasting" | "sugar_random" | "pulse" | "spo2" | "temp" | "weight";

export type Contact = { name: string; phone: string };
export type Profile = {
  id: string;
  name: string;
  relation: string;
  age: string;
  blood: string;
  allergies: string;
  conditions: string;
  contacts: Contact[];
};
export type Med = {
  id: string;
  profileId: string;
  name: string;
  dose: string; // free text, exactly as the doctor wrote it
  times: string[]; // "08:00"
  perDose: number; // tablets per dose
  stock: number; // tablets in hand when stockDate was set
  stockDate: string; // YYYY-MM-DD
  /** tablets already marked taken on stockDate when the count was entered (not to subtract twice) */
  stockOffset?: number;
  endDate: string; // YYYY-MM-DD or "" (ongoing)
};
export type Vital = { id: string; profileId: string; type: VitalType; v1: number; v2?: number; at: string };
export type Visit = { id: string; profileId: string; date: string; time: string; doctor: string; note: string };
export type DiaryEntry = { id: string; profileId: string; at: string; text: string; level: 1 | 2 | 3 };

export type ProData = {
  v: 1;
  profiles: Profile[];
  activeId: string;
  meds: Med[];
  /** "medId|YYYY-MM-DD|HH:MM" -> true when that dose was taken */
  taken: Record<string, boolean>;
  vitals: Vital[];
  visits: Visit[];
  diary: DiaryEntry[];
};

export const MAX_PROFILES = 6;

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function emptyData(name = "मैं"): ProData {
  const id = newId();
  return {
    v: 1,
    profiles: [{ id, name, relation: "self", age: "", blood: "", allergies: "", conditions: "", contacts: [] }],
    activeId: id,
    meds: [],
    taken: {},
    vitals: [],
    visits: [],
    diary: [],
  };
}

/** Accepts saved or imported JSON; returns null when it is not our backup. */
export function parseData(raw: unknown): ProData | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<ProData>;
  if (d.v !== 1 || !Array.isArray(d.profiles) || d.profiles.length === 0) return null;
  const arr = <T>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);
  const profiles = arr<Profile>(d.profiles).slice(0, MAX_PROFILES);
  return {
    v: 1,
    profiles,
    activeId: profiles.some((p) => p.id === d.activeId) ? (d.activeId as string) : profiles[0].id,
    meds: arr<Med>(d.meds),
    taken: d.taken && typeof d.taken === "object" ? (d.taken as Record<string, boolean>) : {},
    vitals: arr<Vital>(d.vitals),
    visits: arr<Visit>(d.visits),
    diary: arr<DiaryEntry>(d.diary),
  };
}

// ---------------- dates ----------------
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function addDaysYmd(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return ymd(new Date(y, m - 1, d + n));
}
export function daysBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

// ---------------- medicines ----------------
export const takenKey = (medId: string, day: string, time: string) => `${medId}|${day}|${time}`;

export function isActiveOn(med: Med, day: string): boolean {
  return day >= med.stockDate.slice(0, 10) && (!med.endDate || day <= med.endDate);
}

/** Tablets used per day. */
export function perDay(med: Med): number {
  return Math.max(0, med.times.length * Math.max(0, med.perDose || 0));
}

/**
 * Tablets left today: stock when it was counted, minus doses marked taken since then.
 * (Doses not marked are assumed still in the strip.)
 */
export function stockLeft(med: Med, taken: Record<string, boolean>): number {
  let used = 0;
  for (const k of Object.keys(taken)) {
    if (!taken[k]) continue;
    const [id, day] = k.split("|");
    if (id === med.id && day >= med.stockDate) used += Math.max(0, med.perDose || 0);
  }
  return Math.max(0, (med.stock || 0) - Math.max(0, used - (med.stockOffset || 0)));
}

/** Tablets marked taken for this medicine on one day. */
export function usedOn(med: Med, taken: Record<string, boolean>, day: string): number {
  return med.times.filter((t) => taken[takenKey(med.id, day, t)]).length * Math.max(0, med.perDose || 0);
}

/** The medicine with a fresh tablet count entered today. */
export function withStock(med: Med, stock: number, taken: Record<string, boolean>, today: string): Med {
  return { ...med, stock, stockDate: today, stockOffset: usedOn(med, taken, today) };
}

/** Days the tablets in hand will last (Infinity when no daily use). */
export function daysLeft(med: Med, taken: Record<string, boolean>): number {
  const pd = perDay(med);
  return pd === 0 ? Infinity : Math.floor(stockLeft(med, taken) / pd);
}

export type MedAlert = "refill" | "out" | "course_ending" | null;

/** Refill when 3 days or less remain and the course continues past that; out at 0. */
export function medAlert(med: Med, taken: Record<string, boolean>, today: string): MedAlert {
  if (!isActiveOn(med, today) && med.endDate && today > med.endDate) return null;
  const left = daysLeft(med, taken);
  const courseDaysLeft = med.endDate ? daysBetween(today, med.endDate) : Infinity;
  if (left === 0 && courseDaysLeft > 0) return "out";
  if (left <= 3 && courseDaysLeft > left) return "refill";
  if (courseDaysLeft >= 0 && courseDaysLeft <= 2) return "course_ending";
  return null;
}

/** Share of scheduled doses marked taken over the last `days` days (today included), 0-100. */
export function adherence(meds: Med[], taken: Record<string, boolean>, today: string, days = 7): number | null {
  let due = 0;
  let done = 0;
  for (let i = 0; i < days; i++) {
    const day = addDaysYmd(today, -i);
    for (const m of meds) {
      if (!isActiveOn(m, day)) continue;
      for (const t of m.times) {
        due++;
        if (taken[takenKey(m.id, day, t)]) done++;
      }
    }
  }
  return due === 0 ? null : Math.round((done / due) * 100);
}

// ---------------- vitals ----------------
export type Level = "ok" | "watch" | "doctor" | "urgent";

export const VITALS: Record<VitalType, { hi: string; en: string; unit: string; two?: boolean; min: number; max: number }> = {
  bp: { hi: "BP (ब्लड प्रेशर)", en: "Blood pressure", unit: "mmHg", two: true, min: 40, max: 300 },
  sugar_fasting: { hi: "शुगर (खाली पेट)", en: "Sugar (fasting)", unit: "mg/dL", min: 20, max: 700 },
  sugar_random: { hi: "शुगर (खाने के बाद/कभी भी)", en: "Sugar (after meal/random)", unit: "mg/dL", min: 20, max: 900 },
  pulse: { hi: "पल्स (धड़कन)", en: "Pulse", unit: "/min", min: 20, max: 250 },
  spo2: { hi: "ऑक्सीजन (SpO2)", en: "Oxygen (SpO2)", unit: "%", min: 50, max: 100 },
  temp: { hi: "बुखार (तापमान)", en: "Temperature", unit: "°F", min: 90, max: 110 },
  weight: { hi: "वजन", en: "Weight", unit: "kg", min: 1, max: 300 },
};

export function validVital(type: VitalType, v1: number, v2?: number): boolean {
  const s = VITALS[type];
  if (!Number.isFinite(v1) || v1 < s.min || v1 > s.max) return false;
  if (s.two) return typeof v2 === "number" && Number.isFinite(v2) && v2 >= 20 && v2 <= 200 && v2 < v1;
  return true;
}

/**
 * General adult reference ranges (common public guidance), only to say "talk to your doctor" or
 * "get help now". Never a diagnosis; children, pregnancy and the doctor's own targets can differ.
 */
export function vitalLevel(type: VitalType, v1: number, v2 = 0): Level {
  switch (type) {
    case "bp":
      if (v1 >= 180 || v2 >= 120 || v1 < 80) return "urgent";
      if (v1 >= 140 || v2 >= 90 || v1 < 90) return "doctor";
      if (v1 >= 130 || v2 >= 80) return "watch";
      return "ok";
    case "sugar_fasting":
      if (v1 < 54 || v1 > 400) return "urgent";
      if (v1 < 70 || v1 >= 126) return "doctor";
      if (v1 >= 100) return "watch";
      return "ok";
    case "sugar_random":
      if (v1 < 54 || v1 > 400) return "urgent";
      if (v1 < 70 || v1 >= 200) return "doctor";
      if (v1 >= 140) return "watch";
      return "ok";
    case "pulse":
      if (v1 < 40 || v1 > 140) return "urgent";
      if (v1 < 50 || v1 > 120) return "doctor";
      if (v1 < 60 || v1 > 100) return "watch";
      return "ok";
    case "spo2":
      if (v1 <= 90) return "urgent";
      if (v1 <= 94) return "doctor";
      return "ok";
    case "temp":
      if (v1 >= 104 || v1 < 95) return "urgent";
      if (v1 >= 102) return "doctor";
      if (v1 >= 99.5) return "watch";
      return "ok";
    case "weight":
      return "ok";
  }
}

export const LEVEL_WORDS: Record<Level, { hi: string; en: string }> = {
  ok: { hi: "सामान्य सीमा में", en: "In the usual range" },
  watch: { hi: "थोड़ा ध्यान दें", en: "Keep an eye on it" },
  doctor: { hi: "डॉक्टर से बात करें", en: "Talk to your doctor" },
  urgent: { hi: "तुरंत मदद लें (108)", en: "Get help now (108)" },
};

export function formatVital(v: Pick<Vital, "type" | "v1" | "v2">): string {
  return VITALS[v.type].two ? `${v.v1}/${v.v2}` : String(v.v1);
}

/** Last `n` readings of one type for a profile, oldest first (for the trend line). */
export function series(vitals: Vital[], profileId: string, type: VitalType, n = 14): Vital[] {
  return vitals
    .filter((v) => v.profileId === profileId && v.type === type)
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-n);
}

// ---------------- SOS ----------------
export function sosMessage(name: string, lat: number | null, lng: number | null, lang: "hi" | "en"): string {
  const where = lat !== null && lng !== null ? `https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}` : "";
  return lang === "hi"
    ? `🆘 ${name} को तुरंत मदद चाहिए। कृपया फोन करें।${where ? `\nलोकेशन: ${where}` : ""}`
    : `🆘 ${name} needs help now. Please call.${where ? `\nLocation: ${where}` : ""}`;
}
