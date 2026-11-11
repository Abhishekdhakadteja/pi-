import { requireRole } from "@/lib/staff";
import { StaffShell } from "@/components/StaffShell";
import { getT } from "@/lib/lang-server";
import { supabaseServer } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { formatDate, todayIST } from "@/lib/dates";
import { Counters, countStatuses } from "@/components/Counters";
import { LiveRefresh } from "@/components/LiveRefresh";
import { CallNextButton, CompleteButton, CourseForm, VisitForm } from "./DoctorForms";

export const dynamic = "force-dynamic";

export default async function DoctorPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const staff = await requireRole(["doctor"]);
  const { t, lang } = await getT();
  const sp = await searchParams;
  const today = todayIST();
  const supabase = await supabaseServer();

  const { data: todays } = await supabase
    .from("appointments")
    .select("id, token_number, status, called_at, patient_id")
    .eq("clinic_id", staff.clinic_id)
    .eq("date", today)
    .order("token_number");
  const rows = todays ?? [];
  const c = countStatuses(rows);
  const inRoom = rows
    .filter((r) => r.status === "in_room")
    .sort((a, b) => String(b.called_at).localeCompare(String(a.called_at)))[0];
  const waiting = rows.filter((r) => r.status === "waiting" || r.status === "booked").length;

  let patient: { id: string; name: string; age: number | null; gender: string | null } | null = null;
  let lastVisit: string | null = null;
  let past: { date: string; doctor_notes: string | null; diagnosis: string | null }[] = [];
  let current: { doctor_notes: string | null; diagnosis: string | null } | null = null;
  let course: { days: number; end_date: string; next_visit_date: string } | null = null;

  if (inRoom) {
    const [{ data: p }, { data: visits }, { data: lastAppt }, { data: crs }] = await Promise.all([
      supabase.from("patients").select("id, name, age, gender").eq("id", inRoom.patient_id).single(),
      supabase
        .from("visits")
        .select("appointment_id, doctor_notes, diagnosis, created_at, appointment:appointments(date)")
        .eq("patient_id", inRoom.patient_id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("appointments")
        .select("date")
        .eq("patient_id", inRoom.patient_id)
        .eq("status", "done")
        .lt("date", today)
        .order("date", { ascending: false })
        .limit(1),
      supabase.from("treatment_courses").select("days, end_date, next_visit_date").eq("appointment_id", inRoom.id).maybeSingle(),
    ]);
    patient = p;
    lastVisit = lastAppt?.[0]?.date ?? null;
    const vs = (visits ?? []) as unknown as {
      appointment_id: string;
      doctor_notes: string | null;
      diagnosis: string | null;
      created_at: string;
      appointment: { date: string } | null;
    }[];
    current = vs.find((v) => v.appointment_id === inRoom.id) ?? null;
    past = vs
      .filter((v) => v.appointment_id !== inRoom.id)
      .map((v) => ({ date: v.appointment?.date ?? v.created_at.slice(0, 10), doctor_notes: v.doctor_notes, diagnosis: v.diagnosis }));
    course = crs;
    await audit(staff, "view", "patients", inRoom.patient_id, { via: "doctor_view" });
    await audit(staff, "view", "visits", inRoom.patient_id, { count: vs.length });
  }

  return (
    <StaffShell staff={staff} denied={!!sp.denied}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("doctorView")}</h1>
        <LiveRefresh clinicId={staff.clinic_id} date={today} />
      </div>
      <Counters {...c} t={t} />

      {!inRoom || !patient ? (
        <div className="card mt-4 flex flex-col gap-4 text-center">
          <p className="text-xl text-slate-600">{t("noOneInRoom")}</p>
          {waiting > 0 ? <CallNextButton /> : <p className="text-lg text-slate-500">{t("noOneWaiting")}</p>}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <section className="card" data-testid="in-room">
            <div className="text-sm font-semibold uppercase text-blue-700">{t("inRoom")}</div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-5xl font-black text-teal-700">{inRoom.token_number}</span>
              <span className="text-2xl font-bold">{patient.name}</span>
            </div>
            <div className="mt-1 text-lg text-slate-600">
              {patient.age != null ? `${patient.age} ${t("years")}` : ""}
              {patient.gender ? ` · ${t(patient.gender as "male")}` : ""} · {t("lastVisit")}:{" "}
              {lastVisit ? formatDate(lastVisit, lang) : t("never")}
            </div>
          </section>

          <section className="card">
            <h2 className="mb-2 text-xl font-bold">{t("pastVisits")}</h2>
            {past.length === 0 ? (
              <p className="text-slate-500">{t("noPastVisits")}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {past.map((v, i) => (
                  <li key={i} className="rounded-xl bg-slate-50 p-3">
                    <div className="font-semibold">{formatDate(v.date, lang, true)}</div>
                    {v.diagnosis && <div className="text-teal-800">{v.diagnosis}</div>}
                    {v.doctor_notes && <div className="whitespace-pre-wrap text-slate-700">{v.doctor_notes}</div>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <VisitForm key={`v-${inRoom.id}`} appointmentId={inRoom.id} notes={current?.doctor_notes ?? ""} diagnosis={current?.diagnosis ?? ""} />
          </section>

          <section className="card">
            <h2 className="mb-2 text-xl font-bold">{t("treatmentCourse")}</h2>
            <CourseForm key={`c-${inRoom.id}`}
              appointmentId={inRoom.id}
              days={course?.days ?? null}
              endDate={course?.end_date ?? null}
              nextVisit={course?.next_visit_date ?? null}
            />
          </section>

          <CompleteButton appointmentId={inRoom.id} />
        </div>
      )}
    </StaffShell>
  );
}
