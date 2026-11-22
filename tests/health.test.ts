import { describe, expect, it } from "vitest";
import { SPECIALTIES, isEmergency, matchSpecialties } from "@/lib/health/specialties";
import { cleanCity, mapsSearchHref, toWhatsAppNumber, whatsAppBookingHref } from "@/lib/health/links";
import { buildRoutine, routineToIcs, type RoutineInput } from "@/lib/health/routine";
import { getHealthWords } from "@/lib/health/words";
import { readFileSync } from "node:fs";
import { isSpecialty as isSignupSpecialty } from "@/lib/signup";

describe("symptom → specialty (not diagnosis)", () => {
  it.each([
    ["घुटने में दर्द", "ortho"],
    ["kamar dard", "ortho"],
    ["knee pain since 2 weeks", "ortho"],
    ["बच्चे को बुखार", "child"],
    ["दांत में दर्द", "dental"],
    ["khujli aur daad", "skin"],
    ["सीने में दर्द और घबराहट", "cardio"],
    ["सीने में तेज दर्द", "cardio"],
    ["pregnancy checkup", "gynae"],
    ["कान में दर्द", "ent"],
    ["sugar badh gayi", "diabetes"],
    ["पथरी", "kidney"],
    ["नींद नहीं आती, टेंशन", "mind"],
  ])("%s → %s", (text, id) => {
    expect(matchSpecialties(text)[0]).toBe(id);
  });

  it("returns nothing for empty or unknown text", () => {
    expect(matchSpecialties("")).toEqual([]);
    expect(matchSpecialties("xyz qwerty")).toEqual([]);
  });

  it("short English words match whole words only", () => {
    // "ent" must not match inside "patient" / "dentist"; "pet" not inside "carpet"
    expect(matchSpecialties("patient")).not.toContain("ent");
    expect(matchSpecialties("carpet")).not.toContain("gastro");
  });

  it("flags emergencies", () => {
    expect(isEmergency("सीने में तेज दर्द हो रहा है")).toBe(true);
    expect(isEmergency("he is unconscious")).toBe(true);
    expect(isEmergency("घुटने में दर्द")).toBe(false);
    expect(isEmergency("")).toBe(false);
  });

  it("every specialty has both languages and a Maps query", () => {
    for (const s of SPECIALTIES) {
      expect(s.hi && s.en && s.query && s.hiAbout && s.enAbout).toBeTruthy();
    }
  });

  it("finder specialty ids are valid sign-up specialty keys", () => {
    for (const s of SPECIALTIES) expect(isSignupSpecialty(s.id)).toBe(true);
  });

  it("directory migration adds no specialty constraint that old rows could break", () => {
    const sql = readFileSync("supabase/migrations/20261122000001_clinic_doctor_name.sql", "utf8");
    const code = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
    expect(code).not.toMatch(/specialty/i);
    expect(sql).toMatch(/add column if not exists doctor_name/);
  });
});

describe("contact links", () => {
  it("only 10-digit Indian numbers get WhatsApp", () => {
    expect(toWhatsAppNumber("+91 98260 12345")).toBe("919826012345");
    expect(toWhatsAppNumber("098260 12345")).toBe("919826012345");
    expect(toWhatsAppNumber("9826012345")).toBe("919826012345");
    expect(toWhatsAppNumber("252525")).toBeNull(); // local landline without STD code
    expect(toWhatsAppNumber(null)).toBeNull();
  });

  it("builds booking and maps links", () => {
    expect(whatsAppBookingHref("919826012345", "Dr. Sharma", "hi")).toMatch(/^https:\/\/wa\.me\/919826012345\?text=/);
    expect(mapsSearchHref("orthopedic doctor", "Guna")).toBe("https://www.google.com/maps/search/?api=1&query=orthopedic%20doctor%20in%20Guna");
  });

  it("cleans the city", () => {
    expect(cleanCity("  Guna<script> ")).toBe("Gunascript");
    expect(cleanCity("गुना")).toBe("गुना");
    expect(cleanCity("")).toBe("Guna");
    expect(cleanCity("", "")).toBe("");
  });
});

describe("मेरा दिन routine", () => {
  const base: RoutineInput = { wake: "06:00", sleep: "22:00", work: null, goals: ["weight"], diet: "veg", medicines: [] };

  it("is sorted, starts at wake-up and ends at sleep", () => {
    const r = buildRoutine(base, "hi");
    expect(r[0].time).toBe("06:00");
    expect(r[r.length - 1].time).toBe("22:00");
    const times = r.map((i) => i.time);
    expect([...times].sort()).toEqual(times);
  });

  it("dinner is at least 2 hours before sleep", () => {
    const r = buildRoutine(base, "en");
    const dinner = r.find((i) => i.title.startsWith("Dinner"))!;
    expect(dinner.time <= "20:00").toBe(true);
  });

  it("shows medicines exactly as typed, with a 'as your doctor told' note", () => {
    const r = buildRoutine({ ...base, medicines: [{ name: "Metformin 500", slots: ["morning", "night"] }] }, "en");
    const meds = r.filter((i) => i.kind === "med");
    expect(meds).toHaveLength(2);
    expect(meds[0].title).toBe("Medicine: Metformin 500");
    expect(meds[0].note).toMatch(/doctor/);
  });

  it("moves exercise after an early shift and keeps meals", () => {
    const r = buildRoutine({ ...base, wake: "05:30", work: { start: "06:00", end: "14:00" }, goals: ["fitness"] }, "en");
    const workout = r.find((i) => i.title.includes("workout"))!;
    expect(workout.time >= "14:00").toBe(true);
    expect(r.some((i) => i.title === "Breakfast")).toBe(true);
    expect(r.some((i) => i.title === "Lunch")).toBe(true);
  });

  it("handles sleeping after midnight", () => {
    const r = buildRoutine({ ...base, wake: "09:00", sleep: "01:00" }, "en");
    expect(r[0].time).toBe("09:00");
    expect(r[r.length - 1].time).toBe("01:00");
  });

  it("goal-specific items appear", () => {
    const r = buildRoutine({ ...base, goals: ["sugar", "bp", "study"] }, "hi");
    expect(r.some((i) => i.title.includes("शुगर"))).toBe(true);
    expect(r.some((i) => i.title.includes("BP"))).toBe(true);
    expect(r.some((i) => i.title.includes("पढ़ाई"))).toBe(true);
  });

  it("makes a valid daily-repeating calendar file", () => {
    const ics = routineToIcs(buildRoutine(base, "hi"), new Date(2026, 10, 20));
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics).toContain("RRULE:FREQ=DAILY");
    expect(ics).toContain("DTSTART;TZID=Asia/Kolkata:20261120T060000");
    expect(ics.trim().endsWith("END:VCALENDAR")).toBe(true);
  });
});

describe("health words", () => {
  it("hi and en have the same keys", () => {
    expect(Object.keys(getHealthWords("hi")).sort()).toEqual(Object.keys(getHealthWords("en")).sort());
  });
});
