"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { checkup, inr, offerDaysLeft, PAINS, PLAN_NAME, type Pain, ADMIN_SAVED, FOLLOWUP_SHARE, REMINDER_RECOVERY, WORK_DAYS } from "@/lib/funnel";
import { PLANS, pctOff } from "@/lib/plans";
import { waLink } from "@/lib/whatsapp";
import { loadJourney, saveJourney, track } from "@/lib/journey-client";

type Lang = "hi" | "en";
type Step = "intro" | "numbers" | "pains" | "scan" | "result" | "offer";
const ORDER: Step[] = ["intro", "numbers", "pains", "scan", "result", "offer"];

const PATIENTS = [10, 20, 30, 50, 80, 120];
const FEES = [150, 200, 300, 500, 800];
const HOURS = [0.5, 1, 2, 3];

const W = {
  hi: {
    kicker: "60 सेकंड · मुफ़्त · कोई नंबर नहीं माँगते",
    title: "आपकी clinic का 60 सेकंड चेकअप",
    sub: "3 टैप में देखिए: हर महीने कितने मरीज़ लौटकर नहीं आते, कितना ₹ छूट रहा है, और कितने घंटे काग़ज़ में जा रहे हैं।",
    go: "चेकअप शुरू करें",
    q1: "रोज़ लगभग कितने मरीज़ देखते हैं?",
    q2: "एक consultation की फीस?",
    q3: "रोज़ कितना समय रजिस्टर, पर्ची और हिसाब में जाता है?",
    q4: "इनमें से क्या-क्या परेशान करता है? (जितने चाहें चुनें)",
    pains: {
      followups: "Follow-up मरीज़ वापस नहीं आते",
      paperwork: "रजिस्टर और पर्ची हाथ से",
      queue: "भीड़, इंतज़ार की शिकायत",
      accounts: "दिन/महीने का हिसाब नहीं मिलता",
      staff: "स्टाफ़ कब आया/गया, पता नहीं",
    } as Record<Pain, string>,
    hr: (h: number) => (h < 1 ? "30 मिनट" : `${h} घंटे`),
    next: "आगे",
    see: "मेरा नतीजा दिखाएँ",
    scan: ["आपके मरीज़ों की संख्या जोड़ी…", "Follow-up का हिसाब लगाया…", "आपके लिए सही प्लान चुना…"],
    resTitle: "आपकी clinic का नतीजा",
    perMonth: "हर महीने लगभग छूट रहा है",
    patientsBack: (n: number) => `${n} follow-up मरीज़ जो WhatsApp याद दिलाने पर लौट सकते हैं`,
    leak: (r: string) => `${r} जो हाथ के हिसाब में दर्ज नहीं होता`,
    hours: (h: number) => `${h} घंटे हर महीने वापस, काग़ज़ से छुट्टी`,
    howCalc: "ये अनुमान कैसे निकला?",
    calc: (v: number, f: number) =>
      `${v} visits/महीना (${WORK_DAYS} दिन) × ${Math.round(FOLLOWUP_SHARE * 100)}% को follow-up × जो नहीं लौटते × ${Math.round(REMINDER_RECOVERY * 100)}% जिन्हें रिमाइंडर वापस लाता है × फीस ₹${f}। समय: रोज़ के admin समय का ${Math.round(ADMIN_SAVED * 100)}%। ये आपके अपने नंबरों से एक सावधान अनुमान है, गारंटी नहीं।`,
    fits: "आपकी clinic के लिए सही",
    payback: (n: number) => `सिर्फ़ ${n} मरीज़ लौटे, और पहले महीने का ख़र्च निकल गया`,
    multiple: (x: number) => `प्लान की क़ीमत का लगभग ${x}x वापस`,
    try: "पहले ख़ुद देखिए, फिर फ़ैसला कीजिए",
    demo: "▶ 5 मिनट LIVE डेमो",
    demoSub: "असली ऐप, नकली मरीज़, बिना पासवर्ड",
    web: "🎬 7 मिनट का वेबिनार",
    webSub: "अपने आप चलता है, आवाज़ में भी",
    toOffer: "सीधे ऑफ़र देखें →",
    offerTitle: "आपका प्लान तैयार है",
    launch: "लॉन्च ऑफ़र",
    daysLeft: (d: number, end: string) => (d > 0 ? `ऑफ़र ${d} दिन और (${end} तक)` : "लॉन्च ऑफ़र ख़त्म"),
    first: "पहला महीना",
    then: (p: string) => `फिर ${p}/महीना · +GST · कभी भी बंद करें`,
    safe: ["Basic: 30 दिन मुफ़्त", "Pro: 14 दिन का trial ऐप के अंदर", "आपका डेटा सिर्फ़ आपका, भारत में सुरक्षित", "सेटअप हम करवाते हैं, 10 मिनट"],
    wa: "WhatsApp पर चालू करवाएँ",
    waSub: "आपका नतीजा मैसेज में भरा होगा, बस Send दबाएँ",
    self: "ख़ुद रजिस्टर करें (2 मिनट)",
    again: "नंबर बदलें",
    back: "पीछे",
  },
  en: {
    kicker: "60 seconds · free · no phone number asked",
    title: "A 60-second check-up of your clinic",
    sub: "3 taps to see how many patients don't come back each month, how much ₹ that is, and how many hours go into paperwork.",
    go: "Start the check-up",
    q1: "About how many patients do you see a day?",
    q2: "Consultation fee?",
    q3: "Time spent daily on register, slips and accounts?",
    q4: "What bothers you? (pick any)",
    pains: {
      followups: "Follow-up patients don't return",
      paperwork: "Register and slips by hand",
      queue: "Crowd, waiting complaints",
      accounts: "Daily/monthly accounts don't add up",
      staff: "No idea when staff come/go",
    } as Record<Pain, string>,
    hr: (h: number) => (h < 1 ? "30 min" : `${h} hours`),
    next: "Next",
    see: "Show my result",
    scan: ["Adding up your patients…", "Working out follow-ups…", "Picking the right plan…"],
    resTitle: "Your clinic's result",
    perMonth: "slipping away every month (approx.)",
    patientsBack: (n: number) => `${n} follow-up patients who could return with a WhatsApp reminder`,
    leak: (r: string) => `${r} not recorded in hand-kept accounts`,
    hours: (h: number) => `${h} hours back every month, free of paperwork`,
    howCalc: "How is this estimated?",
    calc: (v: number, f: number) =>
      `${v} visits/month (${WORK_DAYS} days) × ${Math.round(FOLLOWUP_SHARE * 100)}% asked to follow up × those who don't return × ${Math.round(REMINDER_RECOVERY * 100)}% a reminder brings back × fee ₹${f}. Time: ${Math.round(ADMIN_SAVED * 100)}% of daily admin time. A careful estimate from your own numbers, not a guarantee.`,
    fits: "Right for your clinic",
    payback: (n: number) => `Just ${n} returning patients pay for the first month`,
    multiple: (x: number) => `About ${x}x the plan price back`,
    try: "See it yourself first, then decide",
    demo: "▶ 5-minute LIVE demo",
    demoSub: "Real app, fake patients, no password",
    web: "🎬 7-minute webinar",
    webSub: "Plays by itself, with voice",
    toOffer: "Go straight to the offer →",
    offerTitle: "Your plan is ready",
    launch: "Launch offer",
    daysLeft: (d: number, end: string) => (d > 0 ? `Offer: ${d} more days (till ${end})` : "Launch offer over"),
    first: "First month",
    then: (p: string) => `then ${p}/month · +GST · cancel anytime`,
    safe: ["Basic: 30 days free", "Pro: 14-day trial inside the app", "Your data is yours, stored in India", "We set it up with you, 10 minutes"],
    wa: "Get it on WhatsApp",
    waSub: "Your result is filled in, just press Send",
    self: "Register yourself (2 min)",
    again: "Change numbers",
    back: "Back",
  },
} as const;

function useCountUp(target: number, run: boolean, ms = 1400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return v;
}

const chip = (on: boolean) =>
  `rounded-2xl px-4 py-3 text-base font-bold ring-1 transition active:scale-95 ${
    on ? "bg-gradient-to-r from-[#14d8b8] to-[#22B8F5] text-[#020617] ring-transparent shadow-[0_0_24px_-6px_rgba(34,184,245,0.8)]" : "bg-white/5 text-white ring-white/15 hover:bg-white/10"
  }`;

export function Journey({ lang, refTag, startAt }: { lang: Lang; refTag: string | null; startAt: "offer" | null }) {
  const w = W[lang];
  const [step, setStep] = useState<Step>("intro");
  const [n, setN] = useState(30);
  const [fee, setFee] = useState(300);
  const [hours, setHours] = useState(1);
  const [pains, setPains] = useState<Pain[]>([]);
  const [scanI, setScanI] = useState(0);
  const [showCalc, setShowCalc] = useState(false);

  const r = useMemo(() => checkup({ patientsPerDay: n, fee, adminHoursPerDay: hours, pains }), [n, fee, hours, pains]);
  const shown = useCountUp(r.totalRupees, step === "result");

  // Back from the demo / webinar: pick up where the doctor left.
  useEffect(() => {
    const s = loadJourney();
    if (s) {
      setN(s.n);
      setFee(s.fee);
      setHours(s.hours);
      setPains(s.pains.filter((p): p is Pain => (PAINS as string[]).includes(p)));
      if (startAt === "offer" && s.done) setStep("offer");
      else if (s.done) setStep("result");
    }
    track("start", refTag);
  }, [refTag, startAt]);

  useEffect(() => {
    if (step === "numbers") track("numbers", refTag);
    if (step === "pains") track("pains", refTag);
    if (step === "result") track("result", refTag, r.plan);
    if (step === "offer") track("offer", refTag, r.plan);
    if (step !== "scan") return;
    setScanI(0);
    const a = setTimeout(() => setScanI(1), 550);
    const b = setTimeout(() => setScanI(2), 1100);
    const c = setTimeout(() => {
      saveJourney({ n, fee, hours, pains, done: true });
      setStep("result");
    }, 1700);
    return () => [a, b, c].forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const idx = ORDER.indexOf(step);
  const plan = PLANS[r.plan];
  const daysLeft = offerDaysLeft();
  const endLabel = new Date(`${r.offerEnds}T00:00:00+05:30`).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
  const waText =
    lang === "hi"
      ? `नमस्ते Clinic Easy AI 🙏\nमेरा 60 सेकंड चेकअप:\n• ${n} मरीज़/दिन, फीस ₹${fee}\n• अनुमान: हर महीने ${inr(r.totalRupees)} छूट रहा, ${r.hoursSaved} घंटे बच सकते हैं\n\nमुझे ${PLAN_NAME[r.plan]} चालू करवाना है।`
      : `Hello Clinic Easy AI 🙏\nMy 60-second check-up:\n• ${n} patients/day, fee ₹${fee}\n• Estimate: ${inr(r.totalRupees)}/month slipping, ${r.hoursSaved} hours to save\n\nI want ${PLAN_NAME[r.plan]}.`;

  return (
    <div className="w-full">
      {/* progress */}
      <div className="mb-6 flex items-center gap-1.5" aria-hidden>
        {ORDER.map((s, i) => (
          <span key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= idx ? "bg-gradient-to-r from-[#14d8b8] via-[#22B8F5] to-[#7c5cf6]" : "bg-white/10"}`} />
        ))}
      </div>

      {step === "intro" && (
        <section className="flex flex-col items-center text-center" data-testid="j-intro">
          <span className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-4 py-1.5 text-xs font-bold tracking-wider text-emerald-100">{w.kicker}</span>
          <h1 className="mt-5 text-3xl font-bold leading-tight text-white md:text-4xl">
            <span className="os-gradient-text">{w.title}</span>
          </h1>
          <p className="mt-3 text-lg text-slate-300">{w.sub}</p>
          <button onClick={() => setStep("numbers")} className="btn mt-7 w-full bg-gradient-to-r from-[#14d8b8] via-[#22B8F5] to-[#7c5cf6] text-lg text-[#020617] shadow-[0_0_40px_-8px_rgba(34,184,245,0.8)]" data-testid="j-go">
            🩺 {w.go} →
          </button>
        </section>
      )}

      {step === "numbers" && (
        <section data-testid="j-numbers">
          <h2 className="text-xl font-bold text-white">{w.q1}</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {PATIENTS.map((p) => (
              <button key={p} className={chip(n === p)} onClick={() => setN(p)}>
                {p === 120 ? "100+" : p}
              </button>
            ))}
          </div>
          <h2 className="mt-7 text-xl font-bold text-white">{w.q2}</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {FEES.map((f) => (
              <button key={f} className={chip(fee === f)} onClick={() => setFee(f)}>
                ₹{f}
              </button>
            ))}
          </div>
          <button onClick={() => setStep("pains")} className="btn mt-8 w-full bg-white text-lg text-[#020617]" data-testid="j-next1">
            {w.next} →
          </button>
        </section>
      )}

      {step === "pains" && (
        <section data-testid="j-pains">
          <h2 className="text-xl font-bold text-white">{w.q3}</h2>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {HOURS.map((h) => (
              <button key={h} className={chip(hours === h)} onClick={() => setHours(h)}>
                {w.hr(h)}
              </button>
            ))}
          </div>
          <h2 className="mt-7 text-xl font-bold text-white">{w.q4}</h2>
          <div className="mt-3 flex flex-col gap-2">
            {PAINS.map((p) => {
              const on = pains.includes(p);
              return (
                <button key={p} className={`${chip(on)} text-left`} onClick={() => setPains(on ? pains.filter((x) => x !== p) : [...pains, p])} data-testid={`j-pain-${p}`}>
                  {on ? "✓ " : ""}
                  {w.pains[p]}
                </button>
              );
            })}
          </div>
          <div className="mt-8 flex gap-2">
            <button onClick={() => setStep("numbers")} className="btn bg-white/5 text-white ring-1 ring-white/15">
              ←
            </button>
            <button onClick={() => setStep("scan")} className="btn flex-1 bg-gradient-to-r from-[#14d8b8] via-[#22B8F5] to-[#7c5cf6] text-lg text-[#020617]" data-testid="j-see">
              ✨ {w.see}
            </button>
          </div>
        </section>
      )}

      {step === "scan" && (
        <section className="flex flex-col items-center py-10 text-center" data-testid="j-scan">
          <div className="landing-orb relative h-24 w-24 rounded-full bg-gradient-to-br from-[#14d8b8] via-[#22B8F5] to-[#7c5cf6] opacity-90" />
          <ul className="mt-8 space-y-2 text-slate-200">
            {w.scan.map((s, i) => (
              <li key={s} className={`transition-opacity duration-300 ${i <= scanI ? "opacity-100" : "opacity-20"}`}>
                {i < scanI ? "✓" : "◌"} {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      {step === "result" && (
        <section data-testid="j-result">
          <p className="text-center text-sm font-semibold tracking-wider text-cyan-200">{w.resTitle}</p>
          <div className="card os-scan relative mt-3 overflow-hidden p-5 text-center">
            <div className="font-brand text-5xl font-extrabold text-white" data-testid="j-amount">
              {inr(shown)}
            </div>
            <div className="mt-1 text-slate-300">{w.perMonth}</div>
            <ul className="mt-4 space-y-2 text-left text-sm text-slate-200">
              <li>💚 {w.patientsBack(r.recoveredPatients)} ({inr(r.recoveredRupees)})</li>
              {r.cashLeakRupees > 0 && <li>📒 {w.leak(inr(r.cashLeakRupees))}</li>}
              <li>⏳ {w.hours(r.hoursSaved)}</li>
            </ul>
            <button onClick={() => setShowCalc(!showCalc)} className="mt-3 text-xs text-cyan-300 underline underline-offset-4">
              {w.howCalc}
            </button>
            {showCalc && <p className="mt-2 text-left text-xs leading-relaxed text-slate-400">{w.calc(r.visitsPerMonth, fee)}</p>}
          </div>

          <div className="card mt-4 border border-amber-300/30 p-4">
            <div className="text-xs font-bold tracking-wider text-amber-200">{w.fits}</div>
            <div className="mt-1 text-2xl font-bold text-white">Clinic Easy {PLAN_NAME[r.plan]}</div>
            <div className="mt-1 text-sm text-emerald-300">✓ {w.payback(r.paybackPatients)}</div>
            {r.returnMultiple >= 2 && <div className="text-sm text-emerald-300">✓ {w.multiple(r.returnMultiple)}</div>}
          </div>

          <p className="mt-6 text-center font-semibold text-white">{w.try}</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link href={`/demo?ref=start`} className="rounded-2xl border border-cyan-300/50 bg-cyan-400/10 p-4 text-white hover:bg-cyan-400/20" onClick={() => track("demo", refTag, r.plan)} data-testid="j-demo">
              <div className="text-lg font-bold">{w.demo}</div>
              <div className="text-sm text-slate-300">{w.demoSub}</div>
            </Link>
            <Link href={`/webinar?ref=start`} className="rounded-2xl border border-violet-300/50 bg-violet-400/10 p-4 text-white hover:bg-violet-400/20" onClick={() => track("webinar", refTag, r.plan)} data-testid="j-webinar">
              <div className="text-lg font-bold">{w.web}</div>
              <div className="text-sm text-slate-300">{w.webSub}</div>
            </Link>
          </div>
          <button onClick={() => setStep("offer")} className="mt-4 w-full text-center text-sm font-semibold text-amber-200 underline underline-offset-4" data-testid="j-offer">
            {w.toOffer}
          </button>
          <button onClick={() => setStep("numbers")} className="mt-3 w-full text-center text-xs text-slate-400 underline underline-offset-4">
            {w.again}
          </button>
        </section>
      )}

      {step === "offer" && (
        <section data-testid="j-offerbox">
          <h2 className="text-center text-2xl font-bold text-white">{w.offerTitle}</h2>
          <div className="card relative mt-4 overflow-hidden border border-amber-300/40 p-5">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-white">Clinic Easy {PLAN_NAME[r.plan]}</span>
              <span className="rounded-full bg-amber-300/15 px-2.5 py-1 text-xs font-bold text-amber-100 ring-1 ring-amber-300/40">{w.launch}</span>
            </div>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-lg text-slate-500 line-through">{inr(plan.mrpMonth)}</span>
              <span className="font-brand text-4xl font-extrabold text-white">{inr(r.firstMonthPrice)}</span>
              <span className="pb-1 text-sm text-slate-400">{w.first}</span>
              <span className="ml-auto rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-extrabold text-emerald-300">-{pctOff(plan.mrpMonth, r.firstMonthPrice)}%</span>
            </div>
            <div className="text-xs text-slate-400">{w.then(inr(r.monthPrice))}</div>
            <div className="mt-3 text-sm text-emerald-300">✓ {w.payback(r.paybackPatients)}</div>
            <div className="mt-1 text-xs text-amber-200">{w.daysLeft(daysLeft, endLabel)}</div>
            <ul className="mt-4 grid grid-cols-1 gap-1.5 text-sm text-slate-200 sm:grid-cols-2">
              {w.safe.map((s) => (
                <li key={s}>🛡 {s}</li>
              ))}
            </ul>
          </div>
          <a href={waLink(waText)} target="_blank" rel="noopener noreferrer" onClick={() => track("whatsapp", refTag, r.plan)} className="btn mt-5 w-full flex-col bg-emerald-500 py-4 text-white hover:bg-emerald-400" data-testid="j-wa">
            <span className="text-lg">💬 {w.wa}</span>
            <span className="text-xs font-normal opacity-90">{w.waSub}</span>
          </a>
          <Link href="/signup" onClick={() => track("signup", refTag, r.plan)} className="btn mt-3 w-full border border-white/15 bg-white/5 text-white">
            🩺 {w.self}
          </Link>
          <button onClick={() => setStep("result")} className="mt-4 w-full text-center text-xs text-slate-400 underline underline-offset-4">
            ← {w.back}
          </button>
        </section>
      )}
    </div>
  );
}
