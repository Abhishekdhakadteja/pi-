import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { Staff } from "@/lib/staff";
import { todayIST } from "@/lib/dates";
import { cleanSearch, maskPhone, TOOL_INPUT, TOOL_ROLES, type ToolName } from "./tools-def";

// Runs one AI मैनेजर tool. Every query goes through the logged-in staff member's own Supabase
// session, so Row Level Security decides what can be read (own clinic, own role). Nothing here
// writes to the database. Addresses and full mobile numbers are never returned.

type Json = Record<string, unknown>;

export class ToolInputError extends Error {}

export async function runTool(staff: Staff, name: string, input: unknown): Promise<Json> {
  if (!(name in TOOL_ROLES)) throw new ToolInputError(`unknown tool ${name}`);
  const tool = name as ToolName;
  if (!TOOL_ROLES[tool].includes(staff.role)) throw new ToolInputError(`tool ${name} is not allowed for role ${staff.role}`);
  const parsed = TOOL_INPUT[tool].safeParse(input ?? {});
  if (!parsed.success) throw new ToolInputError(parsed.error.issues.map((i) => i.message).join("; "));
  const args = parsed.data as Json;
  const db = await supabaseServer();

  switch (tool) {
    case "clinic_today": {
      const today = todayIST();
      const { data, error } = await db.from("appointments").select("status").eq("date", today);
      if (error) throw new Error(error.message);
      const counts: Record<string, number> = { booked: 0, waiting: 0, in_room: 0, done: 0, missed: 0 };
      for (const r of data ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
      return {
        today,
        clinic: staff.clinic.name,
        opening_time: staff.clinic.opening_time.slice(0, 5),
        closing_time: staff.clinic.closing_time.slice(0, 5),
        slots_per_day: staff.clinic.slots_per_day,
        default_fee: staff.clinic.default_fee,
        appointments_today: (data ?? []).length,
        by_status: counts,
      };
    }

    case "list_appointments": {
      let q = db
        .from("appointments")
        .select("token_number, slot_time, status, complaint, patient:patients(id, name, age, gender)")
        .eq("date", args.date as string)
        .order("token_number")
        .limit(150);
      if (args.status) q = q.eq("status", args.status as string);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return {
        date: args.date,
        count: (data ?? []).length,
        appointments: (data ?? []).map((a) => {
          const p = a.patient as unknown as { id: string; name: string; age: number | null; gender: string | null } | null;
          return {
            token: a.token_number,
            time: String(a.slot_time).slice(0, 5),
            status: a.status,
            complaint: a.complaint ?? null,
            patient_id: p?.id ?? null,
            patient: p?.name ?? null,
            age: p?.age ?? null,
            gender: p?.gender ?? null,
          };
        }),
      };
    }

    case "find_patients": {
      const raw = String(args.query);
      const digits = raw.replace(/\D/g, "");
      let q = db.from("patients").select("id, name, age, gender, phone").limit(10);
      if (digits.length >= 3 && digits.length === raw.replace(/\s/g, "").length) q = q.like("phone", `%${digits}%`);
      else {
        const text = cleanSearch(raw);
        if (text.length < 2) return { matches: [] };
        q = q.ilike("name", `%${text}%`);
      }
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      const ids = (data ?? []).map((p) => p.id);
      const last = new Map<string, string>();
      if (ids.length) {
        const { data: appts } = await db
          .from("appointments")
          .select("patient_id, date")
          .in("patient_id", ids)
          .order("date", { ascending: false })
          .limit(200);
        for (const a of appts ?? []) if (!last.has(a.patient_id)) last.set(a.patient_id, a.date);
      }
      return {
        matches: (data ?? []).map((p) => ({
          patient_id: p.id,
          name: p.name,
          age: p.age,
          gender: p.gender,
          mobile: maskPhone(p.phone),
          last_visit: last.get(p.id) ?? null,
        })),
      };
    }

    case "patient_history": {
      const id = args.patient_id as string;
      const [p, visits, meds, courses, appts] = await Promise.all([
        db.from("patients").select("name, age, gender, created_at").eq("id", id).maybeSingle(),
        db.from("visits").select("created_at, diagnosis, doctor_notes").eq("patient_id", id).order("created_at", { ascending: false }).limit(20),
        db
          .from("prescription_items")
          .select("created_at, medicine, dose, timing, days, note")
          .eq("patient_id", id)
          .order("created_at", { ascending: false })
          .limit(40),
        db.from("treatment_courses").select("start_date, days, next_visit_date, reminder_status").eq("patient_id", id).order("start_date", { ascending: false }).limit(10),
        db.from("appointments").select("date, status, complaint").eq("patient_id", id).order("date", { ascending: false }).limit(20),
      ]);
      if (p.error) throw new Error(p.error.message);
      if (!p.data) return { error: "No patient with this id in this clinic." };
      return {
        patient: { name: p.data.name, age: p.data.age, gender: p.data.gender, registered: p.data.created_at.slice(0, 10) },
        visits: (visits.data ?? []).map((v) => ({ date: v.created_at.slice(0, 10), diagnosis: v.diagnosis, notes: v.doctor_notes })),
        medicines: (meds.data ?? []).map((m) => ({ date: m.created_at.slice(0, 10), medicine: m.medicine, dose: m.dose, timing: m.timing, days: m.days, note: m.note })),
        follow_up_courses: courses.data ?? [],
        appointments: appts.data ?? [],
      };
    }

    case "money_summary": {
      const from = args.from as string;
      const to = args.to as string;
      const [pay, exp] = await Promise.all([
        db.from("payments").select("amount, discount, mode, kind").gte("paid_on", from).lte("paid_on", to).limit(5000),
        db.from("expenses").select("amount, category").gte("spent_on", from).lte("spent_on", to).limit(5000),
      ]);
      if (pay.error) throw new Error(pay.error.message);
      if (exp.error) throw new Error(exp.error.message);
      const byMode: Record<string, number> = {};
      const byKind: Record<string, number> = {};
      const byCategory: Record<string, number> = {};
      let collected = 0;
      let discount = 0;
      let spent = 0;
      for (const r of pay.data ?? []) {
        collected += r.amount;
        discount += r.discount;
        byMode[r.mode] = (byMode[r.mode] ?? 0) + r.amount;
        byKind[r.kind] = (byKind[r.kind] ?? 0) + r.amount;
      }
      for (const r of exp.data ?? []) {
        spent += r.amount;
        byCategory[r.category] = (byCategory[r.category] ?? 0) + r.amount;
      }
      return {
        from,
        to,
        payments_count: (pay.data ?? []).length,
        collected_rupees: collected,
        discount_rupees: discount,
        collected_by_mode: byMode,
        collected_by_kind: byKind,
        expenses_rupees: spent,
        expenses_by_category: byCategory,
        profit_rupees: collected - spent,
      };
    }

    case "follow_ups": {
      const { data, error } = await db
        .from("treatment_courses")
        .select("next_visit_date, end_date, days, reminder_status, patient:patients(id, name, phone)")
        .gte("next_visit_date", args.from as string)
        .lte("next_visit_date", args.to as string)
        .order("next_visit_date")
        .limit(150);
      if (error) throw new Error(error.message);
      return {
        count: (data ?? []).length,
        follow_ups: (data ?? []).map((c) => {
          const p = c.patient as unknown as { id: string; name: string; phone: string } | null;
          return {
            next_visit: c.next_visit_date,
            course_days: c.days,
            reminder_status: c.reminder_status,
            patient_id: p?.id ?? null,
            patient: p?.name ?? null,
            mobile: maskPhone(p?.phone),
          };
        }),
      };
    }

    case "staff_list": {
      const { data, error } = await db.from("users").select("name, role, active").order("role");
      if (error) throw new Error(error.message);
      return { staff: data ?? [] };
    }
  }
}
