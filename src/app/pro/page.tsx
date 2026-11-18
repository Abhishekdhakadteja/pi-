import { requireRole } from "@/lib/staff";
import { StaffShell } from "@/components/StaffShell";
import { getT } from "@/lib/lang-server";
import { getProWords, rupees } from "@/lib/pro-content";
import { getPlanState, hasPaidBefore, razorpayConfigured } from "@/lib/subscription";
import { getSupportContact } from "@/lib/contact";
import { supabaseServer } from "@/lib/supabase/server";
import { ProBadge } from "@/components/ProBadge";
import { PricingPlans } from "@/components/pro/PricingPlans";

export const dynamic = "force-dynamic";

// Clinic Easy Pro inside the app: the clinic's plan, the free trial, and buying Pro.
export default async function ProPage() {
  const staff = await requireRole(["attender", "doctor", "admin"]);
  const { lang } = await getT();
  const w = getProWords(lang);
  const canBuy = staff.role !== "attender";
  const [state, paidBefore] = await Promise.all([getPlanState(staff.clinic_id), hasPaidBefore(staff.clinic_id)]);
  const { data: payments } = canBuy
    ? await (await supabaseServer())
        .from("subscription_payments")
        .select("id, created_at, plan, cycle, amount_paise, status, period_end")
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(12)
    : { data: null };

  const status = state.trial
    ? w.statusTrial(state.daysLeft ?? 0)
    : state.pro
      ? w.statusPaid(state.daysLeft ?? 0)
      : state.expired
        ? w.statusExpired
        : w.statusBasic;

  return (
    <StaffShell staff={staff}>
      <header className="mb-6 flex flex-col items-center text-center">
        <ProBadge size="lg" label={state.tier === "pro_max" ? "PRO MAX" : state.trial ? "PRO TRIAL" : "PRO"} />
        <h1 className="mt-4 text-3xl font-bold">
          <span className="os-gradient-text">{w.heroTitle}</span>
        </h1>
        <p
          className={`mt-3 rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ${
            state.pro ? "bg-amber-300/10 text-amber-100 ring-amber-300/40" : "bg-white/5 text-slate-300 ring-white/15"
          }`}
          data-testid="plan-status"
        >
          {status}
        </p>
      </header>

      <PricingPlans
        lang={lang}
        ctx={{
          mode: "app",
          current: state.trial ? undefined : state.tier,
          canBuy,
          canStartTrial: state.canStartTrial,
          firstMonthOk: !paidBefore,
          razorpayOn: razorpayConfigured(),
          whatsapp: getSupportContact()?.whatsapp || null,
        }}
      />

      {payments && payments.length > 0 && (
        <section className="card mt-6 p-4">
          <h2 className="mb-2 text-lg font-bold">{w.history}</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between gap-2 text-slate-300">
                <span>
                  {p.created_at.slice(0, 10)} · {p.plan === "pro_max" ? "Pro Max" : "Pro"} · {p.cycle === "year" ? w.yearly : w.monthly}
                </span>
                <span className="font-semibold text-white">{rupees(Math.round(p.amount_paise / 100))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </StaffShell>
  );
}
