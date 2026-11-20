// Doctor self sign-up: pure helpers shared by the server and the browser (unit tested).
// No server imports here.

import { cleanName, normalizePhone } from "@/lib/validate";

/** Specialties a doctor can pick. The key is stored in clinics.specialty (also used later for the patient doctor-finder). */
export const SPECIALTIES = [
  { key: "general", hi: "सामान्य चिकित्सक (General Physician)", en: "General Physician" },
  { key: "ortho", hi: "हड्डी रोग विशेषज्ञ (Orthopedic)", en: "Orthopedic (bones & joints)" },
  { key: "cardio", hi: "हृदय रोग विशेषज्ञ (Cardiologist)", en: "Cardiologist (heart)" },
  { key: "skin", hi: "त्वचा, खाज-खुजली रोग (Dermatologist)", en: "Dermatologist (skin)" },
  { key: "dental", hi: "दाँत के डॉक्टर (Dentist)", en: "Dentist" },
  { key: "gynae", hi: "स्त्री व प्रसूति रोग (Gynecologist)", en: "Gynecologist & Obstetrics" },
  { key: "child", hi: "बाल रोग विशेषज्ञ (Pediatrician)", en: "Pediatrician (children)" },
  { key: "ent", hi: "नाक-कान-गला (ENT)", en: "ENT" },
  { key: "eye", hi: "नेत्र रोग (Eye)", en: "Ophthalmologist (eye)" },
  { key: "diabetes", hi: "शुगर / थायरॉइड (Diabetologist)", en: "Diabetes & Thyroid" },
  { key: "chest", hi: "छाती व साँस रोग (Chest / TB)", en: "Chest & lungs (Pulmonologist)" },
  { key: "gastro", hi: "पेट व लीवर रोग (Gastro)", en: "Gastroenterologist (stomach & liver)" },
  { key: "neuro", hi: "दिमाग व नस रोग (Neurologist)", en: "Neurologist" },
  { key: "mind", hi: "मानसिक रोग (Psychiatrist)", en: "Psychiatrist" },
  { key: "kidney", hi: "किडनी / मूत्र रोग (Nephro / Urology)", en: "Kidney & Urology" },
  { key: "cancer", hi: "कैंसर रोग (Oncologist)", en: "Oncologist (cancer)" },
  { key: "surgeon", hi: "सर्जन (General Surgeon)", en: "General Surgeon" },
  { key: "physio", hi: "फ़िज़ियोथेरेपी (Physiotherapist)", en: "Physiotherapist" },
  { key: "ayurveda", hi: "आयुर्वेद (Ayurveda)", en: "Ayurveda" },
  { key: "homeo", hi: "होम्योपैथी (Homeopathy)", en: "Homeopathy" },
  { key: "other", hi: "अन्य (नीचे लिखें)", en: "Other (type below)" },
] as const;

export type SpecialtyKey = (typeof SPECIALTIES)[number]["key"];

export function isSpecialty(v: unknown): v is SpecialtyKey {
  return SPECIALTIES.some((s) => s.key === v);
}

export function specialtyLabel(key: string | null | undefined, lang: "hi" | "en" = "hi"): string {
  const s = SPECIALTIES.find((x) => x.key === key);
  return s ? s[lang] : "";
}

/** How the doctor proves the mobile / email is theirs. "team" = Clinic Easy team checks on WhatsApp (free, works today). */
export type VerifyChannel = "email" | "mobile" | "team";

export type SignupInput = {
  doctorName: string;
  clinicName: string;
  specialty: SpecialtyKey;
  specialtyOther: string | null;
  city: string;
  phone: string;
  email: string;
  password: string;
  regNo: string | null;
  publicListing: boolean;
  channel: VerifyChannel;
};

export type SignupField =
  | "doctorName"
  | "clinicName"
  | "specialty"
  | "city"
  | "phone"
  | "email"
  | "password"
  | "regNo"
  | "terms";

// Plain characters only (also keeps the value safe inside database filters).
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;

/** Checks the sign-up form. Returns the clean values, or the first field that is wrong. */
export function parseSignup(get: (key: string) => unknown): { ok: true; value: SignupInput } | { ok: false; field: SignupField } {
  const s = (k: string) => (typeof get(k) === "string" ? (get(k) as string).trim() : "");

  const doctorName = cleanName(s("doctor_name").replace(/^(dr\.?\s*)/i, ""));
  if (!doctorName || doctorName.length < 2) return { ok: false, field: "doctorName" };
  const clinicName = cleanName(s("clinic_name"));
  if (!clinicName || clinicName.length < 2) return { ok: false, field: "clinicName" };
  const specialty = s("specialty");
  if (!isSpecialty(specialty)) return { ok: false, field: "specialty" };
  const other = s("specialty_other").replace(/\s+/g, " ").slice(0, 60);
  if (specialty === "other" && other.length < 2) return { ok: false, field: "specialty" };
  const city = s("city").replace(/\s+/g, " ");
  if (city.length < 2 || city.length > 60) return { ok: false, field: "city" };
  const phone = normalizePhone(s("phone"));
  if (!phone) return { ok: false, field: "phone" };
  const email = s("email").toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 120 || email.endsWith("@staff.clinicease.local")) return { ok: false, field: "email" };
  const password = typeof get("password") === "string" ? (get("password") as string) : "";
  if (password.length < 8 || password.length > 72) return { ok: false, field: "password" };
  const regNo = s("reg_no").replace(/\s+/g, " ");
  if (regNo.length > 30) return { ok: false, field: "regNo" };
  if (get("terms") !== "on") return { ok: false, field: "terms" };
  const ch = s("channel");
  const channel: VerifyChannel = ch === "email" || ch === "mobile" ? ch : "team";

  return {
    ok: true,
    value: {
      doctorName,
      clinicName,
      specialty,
      specialtyOther: specialty === "other" ? other : null,
      city,
      phone,
      email,
      password,
      regNo: regNo || null,
      publicListing: get("public_listing") === "on",
      channel,
    },
  };
}

/**
 * The channel actually used: the one the doctor picked if it is switched on, else any switched-on
 * OTP channel, else the free team check on WhatsApp.
 */
export function pickChannel(wanted: VerifyChannel, available: { email: boolean; mobile: boolean }): VerifyChannel {
  if (wanted === "email" && available.email) return "email";
  if (wanted === "mobile" && available.mobile) return "mobile";
  if (wanted !== "team") {
    if (available.mobile) return "mobile";
    if (available.email) return "email";
  }
  return "team";
}

/** "9876543210" -> "98•••••210", "doctor@gmail.com" -> "do•••@gmail.com". */
export function maskTarget(target: string): string {
  if (target.includes("@")) {
    const [u, d] = target.split("@");
    return `${u.slice(0, 2)}•••@${d}`;
  }
  return `${target.slice(0, 2)}•••••${target.slice(-3)}`;
}

/** Short reference the doctor quotes on WhatsApp (first 8 hex chars of the clinic id, upper case). */
export function signupRef(clinicId: string): string {
  return clinicId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/** Text the doctor sends to the Clinic Easy team on WhatsApp in the free "team check" mode. */
export function teamVerifyText(p: { ref: string; doctorName: string; clinicName: string; city: string; phone: string }): string {
  return [
    `नमस्ते Clinic Easy टीम, मैंने रजिस्ट्रेशन किया है। कृपया मेरा account चालू करें।`,
    `Ref: ${p.ref}`,
    `Dr. ${p.doctorName}, ${p.clinicName}, ${p.city}`,
    `Mobile: ${p.phone}`,
  ].join("\n");
}

/** Text the owner sends to the doctor after approving. Never contains a password. */
export function approvedText(p: { appUrl: string; doctorName: string; clinicName: string; phone: string; email: string }): string {
  return [
    `नमस्ते Dr. ${p.doctorName} जी,`,
    `${p.clinicName} का Clinic Easy account चालू हो गया है। 🎉`,
    ``,
    `Login: ${p.appUrl}/login`,
    `• Doctor screen: मोबाइल ${p.phone}`,
    `• Admin (settings, staff, UPI): ${p.email}`,
    `Password वही है जो आपने रजिस्ट्रेशन में रखा था।`,
  ].join("\n");
}
