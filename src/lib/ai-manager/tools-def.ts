// AI मैनेजर (phase 1, "ask only"): the read-only tools Claude may call, and which role gets which.
// Pure module (no server imports) so tests can check the role rules and input validation.

import { z } from "zod";
import type { Role } from "@/lib/staff";

export type ToolName =
  | "clinic_today"
  | "list_appointments"
  | "find_patients"
  | "patient_history"
  | "money_summary"
  | "follow_ups"
  | "staff_list";

/**
 * Who may use which tool. Database RLS already limits every query to the caller's own clinic
 * and role; this list is a second lock so, for example, an attender's question never even
 * reaches a medical-history lookup.
 */
export const TOOL_ROLES: Record<ToolName, Role[]> = {
  clinic_today: ["attender", "doctor", "admin"],
  list_appointments: ["attender", "doctor", "admin"],
  find_patients: ["attender", "doctor", "admin"],
  patient_history: ["doctor"],
  money_summary: ["doctor", "admin"],
  follow_ups: ["doctor", "admin"],
  staff_list: ["admin"],
};

export function toolsForRole(role: Role): ToolName[] {
  return (Object.keys(TOOL_ROLES) as ToolName[]).filter((n) => TOOL_ROLES[n].includes(role));
}

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");
const uuid = z.string().uuid();

/** Longest date range one call may read, so a question cannot pull years of data. */
export const MAX_RANGE_DAYS = 92;

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86_400_000);
}

const range = z
  .object({ from: date, to: date })
  .refine((r) => r.from <= r.to, "from must not be after to")
  .refine((r) => daysBetween(r.from, r.to) <= MAX_RANGE_DAYS, `range can be at most ${MAX_RANGE_DAYS} days`);

export const TOOL_INPUT = {
  clinic_today: z.object({}).strict(),
  list_appointments: z
    .object({
      date,
      status: z.enum(["booked", "waiting", "in_room", "done", "missed"]).optional(),
    })
    .strict(),
  find_patients: z.object({ query: z.string().trim().min(2).max(60) }).strict(),
  patient_history: z.object({ patient_id: uuid }).strict(),
  money_summary: range,
  follow_ups: range,
  staff_list: z.object({}).strict(),
} satisfies Record<ToolName, z.ZodType>;

/** JSON-schema tool definitions sent to Claude. Descriptions are in English for the model. */
export const TOOL_SCHEMAS: Record<ToolName, { description: string; input_schema: Record<string, unknown> }> = {
  clinic_today: {
    description:
      "Today's snapshot of the clinic: today's date (India), opening hours, daily slots, and how many appointments are booked, waiting, in the room, done or missed today. Call this first for any question about today.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  list_appointments: {
    description:
      "Appointments (the patient queue) for one date: token number, time slot, patient name, age, gender, status and the complaint. Optionally only one status. Up to 150 rows.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date as YYYY-MM-DD (India time)." },
        status: { type: "string", enum: ["booked", "waiting", "in_room", "done", "missed"] },
      },
      required: ["date"],
      additionalProperties: false,
    },
  },
  find_patients: {
    description:
      "Search the clinic's patients by part of the name or the mobile number. Returns up to 10 matches with patient_id, name, age, gender, the last 4 digits of the mobile and the last visit date. Use patient_id with other tools.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "At least 2 characters of a name, or digits of a mobile number." } },
      required: ["query"],
      additionalProperties: false,
    },
  },
  patient_history: {
    description:
      "One patient's medical history for the doctor: past visits with diagnosis and doctor notes, medicines prescribed (with dose and days), and treatment follow-up dates. Get patient_id from find_patients or list_appointments first.",
    input_schema: {
      type: "object",
      properties: { patient_id: { type: "string", description: "The patient's id (uuid)." } },
      required: ["patient_id"],
      additionalProperties: false,
    },
  },
  money_summary: {
    description: `Money for a date range (at most ${MAX_RANGE_DAYS} days): fees collected by payment mode and kind, discounts, expenses by category, and profit. Amounts are whole rupees.`,
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date YYYY-MM-DD." },
        to: { type: "string", description: "End date YYYY-MM-DD (inclusive)." },
      },
      required: ["from", "to"],
      additionalProperties: false,
    },
  },
  follow_ups: {
    description: `Patients whose treatment course has its next visit due in a date range (at most ${MAX_RANGE_DAYS} days), with the reminder status. Use it for "who should come back this week" questions.`,
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date YYYY-MM-DD." },
        to: { type: "string", description: "End date YYYY-MM-DD (inclusive)." },
      },
      required: ["from", "to"],
      additionalProperties: false,
    },
  },
  staff_list: {
    description: "The clinic's staff accounts: name, role (attender, doctor, admin) and whether the account is active.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
};

/** "9876543210" -> "••••••3210". Full mobile numbers are never sent to the AI. */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 4 ? `••••••${digits.slice(-4)}` : null;
}

/** Search text safe to put inside a PostgREST `ilike` filter (no commas, brackets, wildcards). */
export function cleanSearch(q: string): string {
  return q.replace(/[%_,()*\\:."']/g, " ").replace(/\s+/g, " ").trim();
}

/** Per-clinic fair-use limit on AI मैनेजर questions per day. */
export const DAILY_QUESTION_LIMIT = { pro: 150, pro_max: 300 } as const;
/** AI patient summaries per clinic per day (a busy clinic sees ~60 patients). */
export const SUMMARY_DAILY_LIMIT = { pro: 150, pro_max: 300 } as const;
export const MAX_QUESTION_CHARS = 500;
export const MAX_HISTORY_TURNS = 8;
/** Most tool rounds Claude may take for one question before we stop and answer with what we have. */
export const MAX_TOOL_ROUNDS = 6;
