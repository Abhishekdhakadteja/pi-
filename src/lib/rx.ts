// Prescription input checks. Pure function (unit tested).
import type { RxLine } from "@/lib/share";

export type RxInput = { medicine?: unknown; dose?: unknown; timing?: unknown; days?: unknown; note?: unknown };
const TIMINGS = ["before_food", "after_food", "any"];

/** Keeps filled lines (name + days), trims text, rejects bad values. null = nothing valid / invalid line. */
export function parseRxLines(input: unknown): RxLine[] | null {
  if (!Array.isArray(input) || input.length > 30) return null;
  const out: RxLine[] = [];
  for (const raw of input as RxInput[]) {
    const medicine = typeof raw?.medicine === "string" ? raw.medicine.replace(/\s+/g, " ").trim() : "";
    const daysStr = raw?.days === undefined || raw?.days === null ? "" : String(raw.days).trim();
    if (!medicine && !daysStr) continue; // empty row
    const days = Number(daysStr);
    if (!medicine || medicine.length > 120 || !Number.isInteger(days) || days < 1 || days > 365) return null;
    const dose = typeof raw.dose === "string" ? raw.dose.trim().slice(0, 40) || null : null;
    const timing = typeof raw.timing === "string" && TIMINGS.includes(raw.timing) ? raw.timing : null;
    const note = typeof raw.note === "string" ? raw.note.trim().slice(0, 200) || null : null;
    out.push({ medicine, dose, timing, days, note });
  }
  return out.length ? out : null;
}
