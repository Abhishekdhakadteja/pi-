import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/owner";
import { supabaseAdmin } from "@/lib/supabase/server";
import { addDays, todayIST } from "@/lib/dates";
import { logout } from "@/app/login/actions";
import { BrandMark } from "@/components/BrandMark";
import { NewClinicForm, ClinicPauseButton, ClinicPlanForm, SignupReview } from "./OwnerForms";
import { signupRef, specialtyLabel } from "@/lib/signup";
import { planState, type ClinicPlanRow } from "@/lib/plans";

export const metadata: Metadata = { title: "Owner · Clinic Easy", robots: { index: false } };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  created_at: string;
  staff: { name: string; role: string; phone: string | null; email: string | null; active: boolean }[];
  patients: number;
  visits30: number;
  lastVisit: string | null;
  planLabel: string;
};

async function loadClinics(): Promise<Row[]> {
  const db = supabaseAdmin();
  const since = addDays(todayIST(), -30);
  const [{ data: clinics }, { data: staff }, { data: plans }] = await Promise.all([
    db.from("clinics").select("id, name, address, phone, created_at").order("created_at", { ascending: false }),
    db.from("users").select("clinic_id, name, role, phone, email, active"),
    // Separate query: before the Pro SQL is run these columns do not exist and this just returns nothing.
    db.from("clinics").select("id, plan, plan_until, pro_trial_ends_at, pro_trial_used"),
  ]);
  const planOf = (id: string) => {
    const row = (plans as (ClinicPlanRow & { id: string })[] | null)?.find((p) => p.id === id);
    if (!row) return "Basic";
    const s = planState(row);
    const name = s.tier === "pro_max" ? "Pro Max" : s.tier === "pro" ? "Pro" : "Basic";
    return s.pro ? `${name}${s.trial ? " (trial)" : ""} · ${s.daysLeft} दिन बाकी` : s.expired ? "Basic (Pro खत्म)" : name;
  };
  return Promise.all(
    (clinics ?? []).map(async (c) => {
      const [patients, visits, last] = await Promise.all([
        db.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", c.id),
        db.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", c.id).gte("date", since),
        db.from("appointments").select("date").eq("clinic_id", c.id).order("date", { ascending: false }).limit(1),
      ]);
      return {
        ...c,
        staff: (staff ?? []).filter((s) => s.clinic_id === c.id),
        patients: patients.count ?? 0,
        visits30: visits.count ?? 0,
        lastVisit: last.data?.[0]?.date ?? null,
        planLabel: planOf(c.id),
      };
    }),
  );
}

type PendingSignup = {
  id: string;
  name: string;
  city: string | null;
  specialty: string | null;
  specialty_other: string | null;
  doctor_reg_no: string | null;
  phone: string | null;
  created_at: string;
};

/** Self sign-ups waiting for the team check. Before the sign-up SQL is run the columns do not exist: empty list. */
async function loadPendingSignups(): Promise<PendingSignup[]> {
  const { data, error } = await supabaseAdmin()
    .from("clinics")
    .select("id, name, city, specialty, specialty_other, doctor_reg_no, phone, created_at")
    .eq("signup_status", "pending")
    .order("created_at", { ascending: false });
  return error ? [] : ((data ?? []) as PendingSignup[]);
}

const ROLE_HI: Record<string, string> = { doctor: "Doctor", admin: "Admin", attender: "Attender" };

export default async function OwnerPage() {
  const owner = await requireOwner();
  const [all, signups] = await Promise.all([loadClinics(), loadPendingSignups()]);
  const pendingIds = new Set(signups.map((p) => p.id));
  const clinics = all.filter((c) => !pendingIds.has(c.id));
  const active = clinics.filter((c) => c.staff.some((s) => s.active)).length;

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-16">
      <header className="sticky top-0 z-10 -mx-4 mb-5 bg-gradient-to-r from-[#050b1a] via-[#0b2545] to-teal-700 px-4 py-3 text-white shadow-lg sm:rounded-b-3xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark size={40} />
            <div className="min-w-0">
              <div className="truncate text-lg font-bold leading-tight">Clinic Easy Owner</div>
              <div className="truncate text-sm text-teal-100/90">{owner.email}</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/admin" className="btn-small bg-white/10 text-white ring-1 ring-white/30">
              ← App
            </Link>
            <form action={logout}>
              <button className="btn-small bg-white/10 text-white ring-1 ring-white/30">Logout</button>
            </form>
          </div>
        </div>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="card text-center">
          <div className="text-3xl font-bold text-teal-800">{clinics.length}</div>
          <div className="text-sm text-slate-500">कुल clinics</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-emerald-700">{active}</div>
          <div className="text-sm text-slate-500">चालू clinics</div>
        </div>
      </div>

      {signups.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-xl font-bold">🩺 नए रजिस्ट्रेशन ({signups.length}): verify करके चालू करें</h2>
          <ul className="flex flex-col gap-3">
            {signups.map((p) => {
              const doc = all.find((c) => c.id === p.id)?.staff ?? [];
              const doctor = doc.find((s) => s.role === "doctor");
              const admin = doc.find((s) => s.role === "admin");
              return (
                <li key={p.id} className="card ring-2 ring-amber-200">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-lg font-bold">{p.name}</div>
                      <div className="text-sm text-slate-500">
                        Ref <b>{signupRef(p.id)}</b> · {p.created_at.slice(0, 16).replace("T", " ")} UTC
                      </div>
                    </div>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    <li><b>Doctor:</b> Dr. {doctor?.name ?? "—"} · {specialtyLabel(p.specialty) || "—"}{p.specialty_other ? ` (${p.specialty_other})` : ""}</li>
                    <li><b>शहर:</b> {p.city ?? "—"} · <b>Reg. no:</b> {p.doctor_reg_no ?? "—"}</li>
                    <li><b>मोबाइल:</b> {p.phone ?? doctor?.phone ?? "—"} · <b>Email:</b> {admin?.email ?? "—"}</li>
                  </ul>
                  <SignupReview clinicId={p.id} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card mb-6">
        <h1 className="mb-1 text-2xl font-bold">+ नई clinic जोड़ें</h1>
        <p className="mb-4 text-sm text-slate-500">
          Doctor मोबाइल नंबर से login करेगा। उसी doctor का email Admin login बनेगा (settings, staff, UPI के लिए)। Attender optional है।
        </p>
        <NewClinicForm />
      </section>

      <h2 className="mb-3 text-xl font-bold">सभी clinics</h2>
      <ul className="flex flex-col gap-3">
        {clinics.map((c) => {
          const on = c.staff.some((s) => s.active);
          return (
            <li key={c.id} className={`card ${on ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-lg font-bold">
                    {c.name} {!on && <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">बंद</span>}
                  </div>
                  <div className="text-sm text-slate-500">
                    {[c.address, c.phone].filter(Boolean).join(" · ") || "—"} · जुड़ी: {c.created_at.slice(0, 10)}
                  </div>
                </div>
                <ClinicPauseButton clinicId={c.id} active={on} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-xl bg-teal-50 p-2">
                  <div className="text-lg font-bold">{c.patients}</div>मरीज़
                </div>
                <div className="rounded-xl bg-teal-50 p-2">
                  <div className="text-lg font-bold">{c.visits30}</div>visits (30 दिन)
                </div>
                <div className="rounded-xl bg-teal-50 p-2">
                  <div className="text-lg font-bold">{c.lastVisit ?? "—"}</div>आख़िरी visit
                </div>
              </div>
              <ClinicPlanForm clinicId={c.id} label={c.planLabel} />
              <ul className="mt-3 flex flex-col gap-1 text-sm">
                {c.staff.map((s, i) => (
                  <li key={i} className={s.active ? "" : "line-through opacity-60"}>
                    <b>{ROLE_HI[s.role] ?? s.role}:</b> {s.name} · {s.phone ?? s.email}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
