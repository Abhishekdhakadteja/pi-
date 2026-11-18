"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Lang } from "@/lib/i18n";
import { LAUNCH_OFFER_ENDS, PLANS, TOP_UPS, pctOff, type Cycle, type PaidPlanId, type PlanId } from "@/lib/plans";
import { BASIC_FEATURES, PRO_FEATURES, getProWords, rupees } from "@/lib/pro-content";
import { confirmProPayment, createProOrder, startProTrial } from "@/app/pro/actions";
import { ProBadge, ProEmblem } from "@/components/ProBadge";

export type PricingContext = {
  mode: "public" | "app";
  /** plan the clinic is on now (app only) */
  current?: PlanId;
  canBuy?: boolean;
  canStartTrial?: boolean;
  firstMonthOk?: boolean;
  razorpayOn?: boolean;
  /** support WhatsApp link, used to buy Pro while online payment is not connected */
  whatsapp?: string | null;
};

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayCtor = new (opts: Record<string, unknown>) => { open: () => void };

function loadCheckout(): Promise<RazorpayCtor> {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error("no Razorpay")));
    s.onerror = () => reject(new Error("checkout script failed"));
    document.body.appendChild(s);
  });
}

function dateLabel(iso: string, lang: Lang) {
  return new Date(`${iso}T00:00:00+05:30`).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
}

export function PricingPlans({ lang, ctx }: { lang: Lang; ctx: PricingContext }) {
  const w = getProWords(lang);
  const [yearly, setYearly] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  const router = useRouter();

  const buy = (plan: PaidPlanId, cycle: Cycle) =>
    start(async () => {
      setMsg(null);
      setBusy(`${plan}-${cycle}`);
      const r = await createProOrder(plan, cycle);
      if (!r.ok) {
        setBusy(null);
        setMsg({ ok: false, text: r.error === "offline" ? w.payOffline : r.error === "not_allowed" ? w.onlyDoctorAdmin : w.payFailed });
        return;
      }
      try {
        const Razorpay = await loadCheckout();
        new Razorpay({
          key: r.checkout.keyId,
          amount: r.checkout.amount,
          currency: "INR",
          order_id: r.checkout.orderId,
          name: "Clinic Easy",
          description: r.checkout.description,
          theme: { color: "#22B8F5" },
          handler: async (res: RazorpayResponse) => {
            const c = await confirmProPayment(res.razorpay_order_id, res.razorpay_payment_id, res.razorpay_signature);
            setMsg({ ok: c.ok, text: c.ok ? w.payOk : w.payFailed });
            setBusy(null);
            if (c.ok) router.refresh();
          },
          modal: { ondismiss: () => setBusy(null) },
        }).open();
      } catch {
        setBusy(null);
        setMsg({ ok: false, text: w.payFailed });
      }
    });

  const trial = () =>
    start(async () => {
      setMsg(null);
      setBusy("trial");
      const r = await startProTrial();
      setBusy(null);
      if (r.ok) {
        setMsg({ ok: true, text: w.trialStarted });
        router.refresh();
      } else setMsg({ ok: false, text: r.error === "trial_used" ? w.trialUsed : r.error === "not_allowed" ? w.onlyDoctorAdmin : w.payFailed });
    });

  const app = ctx.mode === "app";

  function BuyCta({ plan, label }: { plan: PaidPlanId; label: string }) {
    const cycle: Cycle = yearly ? "year" : plan === "pro" && ctx.firstMonthOk !== false && PLANS.pro.firstMonth ? "first_month" : "month";
    const cls =
      plan === "pro" && !(app && ctx.canStartTrial && ctx.canBuy)
        ? "btn w-full bg-gradient-to-r from-amber-300 via-pink-400 to-violet-500 text-[#140a24] shadow-[0_0_40px_-8px_rgba(245,158,11,0.8)] hover:brightness-110"
        : "btn w-full border border-amber-200/40 bg-white/5 text-amber-50 hover:bg-white/10";
    if (!app) {
      return (
        <Link href="/pro" className={cls}>
          {plan === "pro" ? w.ctaTrial : label} →
        </Link>
      );
    }
    if (ctx.current === plan && !yearly) return <span className="btn w-full cursor-default border border-white/15 bg-white/5 text-slate-200">✓ {w.current}</span>;
    if (!ctx.canBuy) return <p className="text-center text-sm text-amber-200/90">{w.onlyDoctorAdmin}</p>;
    if (!ctx.razorpayOn) {
      return ctx.whatsapp ? (
        <a href={`${ctx.whatsapp.split("?")[0]}?text=${encodeURIComponent(`Clinic Easy ${PLANS[plan].name} (${yearly ? "yearly" : "monthly"})`)}`} target="_blank" rel="noreferrer" className={cls}>
          {w.ctaWhatsApp}
        </a>
      ) : (
        <button type="button" className={cls} onClick={() => setMsg({ ok: false, text: w.payOffline })}>
          {label}
        </button>
      );
    }
    return (
      <button type="button" disabled={!!busy} onClick={() => buy(plan, cycle)} className={cls} data-testid={`buy-${plan}`}>
        {busy === `${plan}-${cycle}` ? w.working : label}
      </button>
    );
  }

  function Price({ id }: { id: PlanId }) {
    const p = PLANS[id];
    const mrp = yearly ? p.mrpMonth * 12 : p.mrpMonth;
    const price = yearly ? p.year : p.month;
    return (
      <div className="mt-4">
        <div className="flex items-center gap-2">
          <span className="text-lg text-slate-500 line-through decoration-rose-400/80 decoration-2">{rupees(mrp)}</span>
          <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-extrabold text-emerald-300 ring-1 ring-emerald-400/40">{w.off(pctOff(mrp, price))}</span>
        </div>
        <div className="mt-1 flex items-end gap-1">
          <span className="font-brand text-4xl font-extrabold text-white">{rupees(price)}</span>
          <span className="pb-1 text-slate-400">{yearly ? w.perYear : w.perMonth}</span>
        </div>
        <div className="text-xs text-slate-500">
          {w.plusGst}
          {yearly ? ` · ${w.yearEquals(rupees(Math.round(p.year / 12)))}` : ""}
        </div>
      </div>
    );
  }

  const quota = (id: PaidPlanId) => {
    const q = PLANS[id].quota!;
    return (Object.keys(w.q) as (keyof typeof w.q)[]).map((k) => w.q[k](q[k]));
  };

  return (
    <div data-testid="pricing">
      {/* cycle toggle + offer */}
      <div className="flex flex-col items-center gap-3">
        <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-sm font-semibold text-amber-200">
          ⏳ {w.offerEnds(dateLabel(LAUNCH_OFFER_ENDS, lang))}
        </span>
        <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1" role="tablist">
          {[false, true].map((y) => (
            <button
              key={String(y)}
              type="button"
              role="tab"
              aria-selected={yearly === y}
              onClick={() => setYearly(y)}
              className={`min-h-10 rounded-full px-4 text-sm font-bold transition ${
                yearly === y ? "bg-gradient-to-r from-[#14d8b8] via-[#22B8F5] to-[#7c5cf6] text-[#020617]" : "text-slate-300"
              }`}
            >
              {y ? w.yearly : w.monthly}
              {y && <span className="ml-1.5 rounded-full bg-black/25 px-1.5 text-[10px]">{w.yearlySave}</span>}
            </button>
          ))}
        </div>
      </div>

      {msg && <p className={`${msg.ok ? "ok-box" : "error-box"} mx-auto mt-4 max-w-xl text-center`} role="status">{msg.text}</p>}

      <div className="mt-6 grid gap-4 lg:grid-cols-3 lg:items-start">
        {/* Basic */}
        <section className="card flex flex-col p-5" data-testid="plan-basic">
          <div className="text-sm font-semibold text-cyan-300">{w.planTag.basic}</div>
          <h3 className="mt-1 text-2xl font-bold text-white">Basic</h3>
          <div className="text-sm text-slate-400">
            {w.doctors(1)} · {w.trialBasic}
          </div>
          <Price id="basic" />
          <p className="mt-4 font-semibold text-white">{w.basicIncludes}</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-slate-300">
            {BASIC_FEATURES[lang].map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-emerald-300">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-5">
            {app ? (
              ctx.current === "basic" ? (
                <span className="btn w-full cursor-default border border-white/15 bg-white/5 text-slate-200">✓ {w.current}</span>
              ) : null
            ) : (
              <Link href="/login" className="btn w-full border border-white/15 bg-white/5 text-white hover:bg-white/10">
                {w.ctaBasic}
              </Link>
            )}
          </div>
        </section>

        {/* Pro: the hero card */}
        <section className="pro-card-hero relative flex flex-col rounded-3xl p-5 lg:-mt-3" data-testid="plan-pro">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-300 via-pink-400 to-violet-500 px-3 py-1 text-xs font-extrabold text-[#140a24] shadow-lg">
            ★ {w.mostPopular}
          </span>
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-amber-200">{w.planTag.pro}</div>
            <ProBadge size="sm" />
          </div>
          <h3 className="mt-1 text-2xl font-bold">
            <span className="pro-text">Clinic Easy Pro</span>
          </h3>
          <div className="text-sm text-slate-300">
            {w.doctors(1)} · {w.trialPro}
          </div>
          <Price id="pro" />
          {!yearly && PLANS.pro.firstMonth && ctx.firstMonthOk !== false && (
            <div className="mt-3 rounded-xl border border-pink-400/40 bg-pink-500/10 px-3 py-2 text-sm font-semibold text-pink-100">
              🎁 {w.firstMonth(rupees(PLANS.pro.firstMonth))} <span className="text-pink-300">({w.firstMonthTag})</span>
            </div>
          )}
          <p className="mt-4 font-semibold text-white">{w.proIncludes}</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-slate-200">
            {PRO_FEATURES[lang].map((f) => (
              <li key={f} className="flex gap-2">
                <span className="pro-text font-bold">✦</span>
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-amber-200/80">{w.quotaTitle}</p>
          <ul className="mt-1 grid grid-cols-1 gap-1 text-xs text-slate-400 sm:grid-cols-2">
            {quota("pro").map((q) => (
              <li key={q}>• {q}</li>
            ))}
          </ul>
          <div className="mt-5 flex flex-col gap-2">
            {app && ctx.canStartTrial && ctx.canBuy && (
              <button
                type="button"
                disabled={!!busy}
                onClick={trial}
                data-testid="start-trial"
                className="btn w-full bg-gradient-to-r from-amber-300 via-pink-400 to-violet-500 text-[#140a24] shadow-[0_0_40px_-8px_rgba(245,158,11,0.8)] hover:brightness-110"
              >
                {busy === "trial" ? w.working : `✦ ${w.ctaTrial}`}
              </button>
            )}
            <BuyCta plan="pro" label={w.ctaBuy} />
          </div>
        </section>

        {/* Pro Max */}
        <section className="card flex flex-col border-amber-200/20 p-5" data-testid="plan-pro_max">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-amber-200">{w.planTag.pro_max}</div>
            <ProBadge size="sm" label="MAX" />
          </div>
          <h3 className="mt-1 text-2xl font-bold text-white">Pro Max</h3>
          <div className="text-sm text-slate-400">
            {w.doctors(PLANS.pro_max.doctors)} · {w.trialPro}
          </div>
          <Price id="pro_max" />
          <p className="mt-4 font-semibold text-white">{w.proIncludes.replace("Basic", "Pro")}</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-slate-300">
            {w.proMaxExtra.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="pro-text font-bold">✦</span>
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-amber-200/80">{w.quotaTitle}</p>
          <ul className="mt-1 grid grid-cols-1 gap-1 text-xs text-slate-400 sm:grid-cols-2">
            {quota("pro_max").map((q) => (
              <li key={q}>• {q}</li>
            ))}
          </ul>
          <div className="mt-5">
            <BuyCta plan="pro_max" label={w.ctaBuyMax} />
          </div>
        </section>
      </div>

      {/* top-ups + promise */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="card p-4">
          <h3 className="font-bold text-white">{w.topUpTitle}</h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-slate-300">
            {TOP_UPS.map((t) => (
              <li key={t.id} className="flex justify-between gap-2">
                <span>{t[lang]}</span>
                <span className="font-semibold text-white">
                  {rupees(t.price)}
                  {t.id === "doctor" ? w.perMonth : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card flex items-center gap-3 p-4">
          <ProEmblem size={44} id="pro-guarantee" />
          <div>
            <p className="font-semibold text-white">{w.guarantee}</p>
            <p className="mt-1 text-sm text-slate-400">{w.soonNote}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
