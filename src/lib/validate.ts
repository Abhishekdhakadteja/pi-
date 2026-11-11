// Input validation shared by server and browser. Pure functions (unit tested).

/** Turns "+91 98765-43210", "098765 43210", "919876543210" into "9876543210". Returns null if invalid. */
export function normalizePhone(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let d = input.replace(/[^0-9]/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9][0-9]{9}$/.test(d) ? d : null;
}

/** Valid calendar date in YYYY-MM-DD form. */
export function isValidDate(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && y >= 2020 && y <= 2100;
}

export function cleanName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const v = input.replace(/\s+/g, " ").trim();
  return v.length >= 1 && v.length <= 120 ? v : null;
}

export function parseAge(input: unknown): number | null | "invalid" {
  if (input === null || input === undefined || input === "") return null;
  const n = Number(input);
  return Number.isInteger(n) && n >= 0 && n <= 120 ? n : "invalid";
}

export function parseDays(input: unknown): number | null {
  const n = Number(input);
  return Number.isInteger(n) && n >= 1 && n <= 365 ? n : null;
}

export function cleanText(input: unknown, max = 4000): string {
  return typeof input === "string" ? input.trim().slice(0, max) : "";
}

export const GENDERS = ["male", "female", "other"] as const;
export type Gender = (typeof GENDERS)[number];
export function parseGender(input: unknown): Gender | null {
  return GENDERS.includes(input as Gender) ? (input as Gender) : null;
}
