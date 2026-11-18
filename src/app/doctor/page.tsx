import { requireRole } from "@/lib/staff";
import { StaffShell } from "@/components/StaffShell";
import { getT } from "@/lib/lang-server";
import { supabaseServer } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { formatDate, todayIST } from "@/lib/dates";
import { Counters, countStatuses } from "@/components/Counters";
import { LiveRefresh } from "@/components/LiveRefresh";
import { CallNextButton, CompleteButton, CourseForm, VisitForm } from "./DoctorForms";
import { RxForm } from "./RxForm";
import { AiBrief } from "@/components/os/AiBrief";
import { PatientBrief } from "@/components/os/PatientBrief";
import { buildPatientBrief } from "@/lib/ai-brief";
import { getOsWords } from "@/lib/os-content";
import { aiConfigured } from "@/lib/ai";
import { getPlanState } from "@/lib/subscription";
import { getProWords } from "@/lib/pro-content";

export const dynamic = "force-dynamic";

export default async function DoctorPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const staff = await requireRole(["doctor"]);
  const { t, lang } = await getT();
  const sp = await searchParams;
  const today = todayIST();
  const supabase = await supabaseServer();
  const plan = await getPlanState(staff.clinic_id);

  const { data: todays } = await supabase
    .from("appointments")
    .select("id, token_number, status, called_at, patient_id, complaint")
    .eq("clinic_id", staff.clinic_id)
    .eq("date", today)
    .order("token_number");
  const rows = todays ?? [];
  const c = countStatuses(rows);
  const inRoom = rows
    .filter((r) => r.status === "in_room")
    .sort((a, b) => String(b.called_at).localeCompare(String(a.called_at)))[0];
  const waiting = rows.filter((r) => r.status === "waiting" || r.status === "booked").length;

  let patient: { id: string; name: string; age: number | null; gender: string | null; address: string | null } | null = null;
  let lastVisit: string | null = null;
  let past: { date: string; doctor_notes: string | null; diagnosis: string | null }[] = [];
  let current: { doctor_notes: string | null; diagnosis: string | null } | null = null;
  let course: { days: number; end_date: string; next_visit_date: string } | null = null;
  let rx: { medicine: string; dose: string | null; timing: string | null; days: number; note: string | null }[] = [];
  let briefLines: string[] = [];
  const w = getOsWords(lang);

  if (inRoom) {
    const [{ data: p }, { data: visits }, { data: lastAppt }, { data: crs }, { data: rxRows }, { data: oldRx }, { data: oldCourse }] = await Promise.all([
      supabase.from("patients").select("id, name, age, gender, address").eq("id", inRoom.patient_id).single(),
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
      supabase.from("prescription_items").select("medicine, dose, timing, days, note").eq("appointment_id", inRoom.id).order("position"),
      supabase
        .from("prescription_items")
        .select("medicine, appointment_id")
        .eq("patient_id", inRoom.patient_id)
        .neq("appointment_id", inRoom.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("treatment_courses")
        .select("end_date")
        .eq("patient_id", inRoom.patient_id)
        .neq("appointment_id", inRoom.id)
        .order("end_date", { ascending: false })
        .limit(1),
    ]);
    rx = rxRows ?? [];
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
    const lastRxAppt = oldRx?.[0]?.appointment_id;
    briefLines = buildPatientBrief(
      {
        pastVisits: past,
        lastRx: (oldRx ?? []).filter((r) => r.appointment_id === lastRxAppt).map((r) => r.medicine),
        lastCourseEnd: oldCourse?.[0]?.end_date ?? null,
        complaint: inRoom.complaint,
      },
      w,
      (d) => formatDate(d, lang),
    );
    await audit(staff, "view", "patients", inRoom.patient_id, { via: "doctor_view" });
    await audit(staff, "view", "visits", inRoom.patient_id, { count: vs.length });
  }

  return (
    <StaffShell staff={staff} denied={!!sp.denied}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("doctorView")}</h1>
        <LiveRefresh clinicId={staff.clinic_id} date={today} />
      </div>
      <AiBrief staff={staff} lang={lang} compact hideStats />
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
            {patient.address && <div className="text-slate-500">📍 {patient.address}</div>}
            {inRoom.complaint && (
              <div className="mt-3 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
                <div className="text-sm font-semibold text-amber-800">🩺 {t("todayComplaint")}</div>
                <div className="text-lg text-amber-950">{inRoom.complaint}</div>
              </div>
            )}
          </section>

          <PatientBrief
            appointmentId={inRoom.id}
            lines={briefLines}
            aiOn={aiConfigured() && plan.pro}
            proLocked={!plan.pro ? getProWords(lang).aiProOnly : null}
            words={{ pbTitle: w.pbTitle, pbAuto: w.pbAuto, pbAi: w.pbAi, pbAiWorking: w.pbAiWorking, pbAiFailed: w.pbAiFailed, pbAiOff: w.pbAiOff, pbAiNote: w.pbAiNote, soon: w.soon }}
          />

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
            <h2 className="mb-2 text-xl font-bold">{t("prescription")}</h2>
            <RxForm key={`rx-${inRoom.id}`} appointmentId={inRoom.id} initial={rx} />
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
