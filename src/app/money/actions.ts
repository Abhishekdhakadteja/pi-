"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { assertRole } from "@/lib/staff";
import { cleanText } from "@/lib/validate";
import { parseAmount } from "@/lib/money";
import type { ErrorCode } from "@/lib/i18n";

type Res = { ok: true } | { ok: false; error: ErrorCode };
const MODES = ["cash", "upi", "card", "other"] as const;
const KINDS = ["consultation", "procedure", "medicine", "test", "other"] as const;
const CATS = ["rent", "salary", "medicine_purchase", "electricity", "equipment", "other"] as const;
const UUID = /^[0-9a-f-]{36}$/;

export async function recordPayment(input: {
  appointmentId?: string | null;
  amount: string;
  discount?: string;
  mode: string;
  kind?: string;
  note?: string;
}): Promise<Res> {
  const staff = await assertRole(["attender", "doctor", "admin"]);
  const amount = parseAmount(input.amount);
  const discount = parseAmount(input.discount || "0") ?? -1;
  if (amount === null || discount < 0) return { ok: false, error: "err_amount" };
  const mode = MODES.find((m) => m === input.mode);
  const kind = KINDS.find((k) => k === (input.kind ?? "consultation"));
  if (!mode || !kind) return { ok: false, error: "err_generic" };
  const supabase = await supabaseServer();

  let patient_id: string | null = null;
  let appointment_id: string | null = null;
  if (input.appointmentId) {
    if (!UUID.test(input.appointmentId)) return { ok: false, error: "err_generic" };
    const { data: appt } = await supabase
      .from("appointments")
      .select("id, patient_id")
      .eq("id", input.appointmentId)
      .eq("clinic_id", staff.clinic_id)
      .maybeSingle();
    if (!appt) return { ok: false, error: "err_generic" };
    appointment_id = appt.id;
    patient_id = appt.patient_id;
  }
  const { error } = await supabase.from("payments").insert({
    clinic_id: staff.clinic_id,
    appointment_id,
    patient_id,
    amount,
    discount,
    mode,
    kind,
    note: cleanText(input.note, 300) || null,
    created_by: staff.id,
  });
  if (error) return { ok: false, error: "err_generic" };
  revalidatePath("/today");
  revalidatePath("/money");
  return { ok: true };
}

export async function addExpense(input: { amount: string; category: string; note?: string; date?: string }): Promise<Res> {
  const staff = await assertRole(["doctor", "admin"]);
  const amount = parseAmount(input.amount, 1);
  if (amount === null) return { ok: false, error: "err_amount" };
  const category = CATS.find((c) => c === input.category);
  if (!category) return { ok: false, error: "err_generic" };
  const supabase = await supabaseServer();
  const row: Record<string, unknown> = {
    clinic_id: staff.clinic_id,
    amount,
    category,
    note: cleanText(input.note, 300) || null,
    created_by: staff.id,
  };
  if (input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date)) row.spent_on = input.date;
  const { error } = await supabase.from("expenses").insert(row);
  if (error) return { ok: false, error: "err_generic" };
  revalidatePath("/money");
  return { ok: true };
}

export async function deleteEntry(table: "payments" | "expenses", id: string): Promise<Res> {
  const staff = await assertRole(table === "payments" ? ["admin"] : ["doctor", "admin"]);
  if (!UUID.test(id)) return { ok: false, error: "err_generic" };
  const supabase = await supabaseServer();
  const { error } = await supabase.from(table).delete().eq("id", id).eq("clinic_id", staff.clinic_id);
  if (error) return { ok: false, error: "err_generic" };
  revalidatePath("/money");
  revalidatePath("/today");
  return { ok: true };
}
