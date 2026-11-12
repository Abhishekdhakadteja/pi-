import { notFound } from "next/navigation";
import { requireRole } from "@/lib/staff";
import { getT } from "@/lib/lang-server";
import { supabaseServer } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { formatDate } from "@/lib/dates";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

/** Printable A5-style prescription slip. Never shows doctor notes. */
export default async function RxPrint({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireRole(["doctor", "attender", "admin"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { t, lang } = await getT();
  const supabase = await supabaseServer();
  const { data: appt } = await supabase
    .from("appointments")
    .select("id, date, token_number, patient:patients(name, age, gender, phone), doctor:users(name)")
    .eq("id", id)
    .eq("clinic_id", staff.clinic_id)
    .maybeSingle();
  if (!appt) notFound();
  const [{ data: lines }, { data: clinic }, { data: course }] = await Promise.all([
    supabase.from("prescription_items").select("medicine, dose, timing, days, note").eq("appointment_id", id).order("position"),
    supabase.from("clinics").select("name, address, phone").eq("id", staff.clinic_id).single(),
    supabase.from("treatment_courses").select("next_visit_date").eq("appointment_id", id).maybeSingle(),
  ]);
  const a = appt as unknown as {
    date: string;
    token_number: number;
    patient: { name: string; age: number | null; gender: string | null } | null;
    doctor: { name: string } | null;
  };
  const doctorName = a.doctor?.name ?? (staff.role === "doctor" ? staff.name : null);
  await audit(staff, "print", "prescription_items", id);
  const timing = (v: string | null) =>
    v === "before_food" ? t("timing_before_food") : v === "after_food" ? t("timing_after_food") : "";

  return (
    <main className="mx-auto max-w-xl bg-white p-6 text-slate-900">
      <header className="border-b-2 border-teal-700 pb-3">
        <div className="text-2xl font-black text-teal-800">{clinic?.name}</div>
        <div className="text-sm">{[clinic?.address, clinic?.phone].filter(Boolean).join(" · ")}</div>
        {doctorName && <div className="mt-1 font-semibold">Dr. {doctorName}</div>}
      </header>
      <section className="mt-3 flex justify-between text-lg">
        <span>
          {t("patientWord")}: <b>{a.patient?.name}</b>
          {a.patient?.age != null && ` · ${a.patient.age} ${t("years")}`}
        </span>
        <span>{formatDate(a.date, lang, true)}</span>
      </section>
      <div className="mt-4 text-3xl font-black">℞</div>
      <ol className="mt-2 flex flex-col gap-3">
        {(lines ?? []).map((l, i) => (
          <li key={i} className="border-b pb-2">
            <div className="text-lg font-bold">
              {i + 1}. {l.medicine}
            </div>
            <div>{[l.dose, timing(l.timing), `${l.days} ${t("daysWord")}`, l.note].filter(Boolean).join(" · ")}</div>
          </li>
        ))}
      </ol>
      {course?.next_visit_date && (
        <p className="mt-4 rounded-lg bg-teal-50 p-3 text-lg">
          {t("nextVisit")}: <b>{formatDate(course.next_visit_date, lang, true)}</b>
        </p>
      )}
      <PrintButton label={t("printRx")} />
    </main>
  );
}
