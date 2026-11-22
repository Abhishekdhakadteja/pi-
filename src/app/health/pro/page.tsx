import Link from "next/link";
import { getLang } from "@/lib/lang-server";
import { getPatientPro, trialUsed } from "@/lib/health/patient-pro";
import { PATIENT_FEATURES, PATIENT_PRO } from "@/lib/health/pro-plan";
import { getTeam } from "@/lib/contact";
import { activateAction, startTrialAction } from "./actions";

export const dynamic = "force-dynamic";

const W = {
  hi: {
    kicker: "मरीज़ों और परिवार के लिए",
    title: "Clinic Easy Health Pro",
    sub: "पूरे परिवार की दवा, सेहत रिकॉर्ड, इमरजेंसी और डॉक्टर रिपोर्ट, एक ऐप में। डेटा सिर्फ़ आपके फोन में।",
    basic: "Basic",
    free: "मुफ़्त, हमेशा",
    pro: "Pro",
    perMonth: "/महीना",
    yearly: "या ₹4,999/साल (2 महीने मुफ़्त)",
    gst: "+ 18% GST",
    trial: "7 दिन मुफ़्त आज़माएँ",
    trialUsed: "मुफ़्त ट्रायल इस फोन पर इस्तेमाल हो चुका है",
    buy: "WhatsApp पर Pro लें",
    buyMsg: "नमस्ते Clinic Easy, मुझे Health Pro (₹499/महीना) लेना है। मेरा नाम: ",
    haveCode: "पेमेंट कर दिया? एक्टिवेशन कोड या लिंक डालें",
    activate: "Pro चालू करें",
    bad: "कोड गलत है या उसकी तारीख निकल गई। हमें WhatsApp करें।",
    youArePro: "आपका Pro चालू है",
    youAreTrial: "आपका मुफ़्त ट्रायल चालू है",
    until: "तक",
    openApp: "मेरी हेल्थ ऐप खोलें",
    soon: "जल्द",
    included: "शामिल",
    howPay: "WhatsApp पर UPI से पेमेंट करें, 10 मिनट में एक्टिवेशन लिंक आपके WhatsApp पर आ जाएगा।",
    privacy: "आपकी सेहत की जानकारी हमारे सर्वर पर नहीं जाती। फोन बदलें तो ऐप से बैकअप फ़ाइल लेकर नए फोन में डालें।",
    note: "यह ऐप डॉक्टर की जगह नहीं लेता। दवा और इलाज हमेशा अपने डॉक्टर से पूछकर।",
  },
  en: {
    kicker: "For patients and families",
    title: "Clinic Easy Health Pro",
    sub: "Your whole family's medicines, health log, emergency card and doctor report in one app. Data stays on your phone.",
    basic: "Basic",
    free: "Free, forever",
    pro: "Pro",
    perMonth: "/month",
    yearly: "or ₹4,999/year (2 months free)",
    gst: "+ 18% GST",
    trial: "Try free for 7 days",
    trialUsed: "The free trial was already used on this phone",
    buy: "Get Pro on WhatsApp",
    buyMsg: "Hello Clinic Easy, I want Health Pro (₹499/month). My name: ",
    haveCode: "Paid already? Enter your activation code or link",
    activate: "Turn on Pro",
    bad: "The code is wrong or expired. Message us on WhatsApp.",
    youArePro: "Your Pro is on",
    youAreTrial: "Your free trial is on",
    until: "until",
    openApp: "Open my health app",
    soon: "Soon",
    included: "Included",
    howPay: "Pay by UPI on WhatsApp; your activation link arrives on WhatsApp within minutes.",
    privacy: "Your health data never goes to our server. Changing phones? Take a backup file from the app and load it on the new phone.",
    note: "This app does not replace a doctor. Always ask your doctor about medicines and treatment.",
  },
};

export default async function PatientProPage({ searchParams }: { searchParams: Promise<{ bad?: string }> }) {
  const lang = await getLang();
  const w = W[lang];
  const sp = await searchParams;
  const pro = await getPatientPro();
  const usedTrial = await trialUsed();
  const sales = getTeam().find((t) => t.role === "sales") ?? getTeam()[0];
  const buyHref = sales?.phone ? `https://wa.me/91${sales.phone}?text=${encodeURIComponent(w.buyMsg)}` : null;
  const off = Math.round((1 - PATIENT_PRO.month / PATIENT_PRO.mrpMonth) * 100);

  return (
    <main>
      <section className="py-4 text-center">
        <p className="text-sm font-semibold tracking-wide text-pink-200">{w.kicker}</p>
        <h1 className="mt-1 text-3xl font-bold text-white">
          <span className="landing-gradient-text">{w.title}</span>
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-slate-300">{w.sub}</p>
      </section>

      {pro.status !== "none" && (
        <div className="mb-4 rounded-3xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-center" data-testid="pro-on">
          <p className="text-lg font-bold text-emerald-100">
            ✅ {pro.status === "pro" ? w.youArePro : w.youAreTrial} · {pro.until} {w.until}
          </p>
          <Link href="/health/my" className="health-btn mt-3 inline-flex items-center">
            {w.openApp} →
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="health-card">
          <p className="text-lg font-bold text-white">{w.basic}</p>
          <p className="text-3xl font-bold text-white">₹0</p>
          <p className="text-sm text-slate-400">{w.free}</p>
        </div>
        <div className="health-card border-pink-400/50 bg-gradient-to-br from-pink-500/10 to-violet-500/10">
          <p className="flex items-center gap-2 text-lg font-bold text-white">
            {w.pro}
            <span className="rounded-full bg-pink-500/30 px-2 py-0.5 text-xs text-pink-100">-{off}%</span>
          </p>
          <p className="text-3xl font-bold text-white">
            ₹{PATIENT_PRO.month}
            <span className="text-base font-normal text-slate-300">{w.perMonth}</span>{" "}
            <s className="text-base font-normal text-slate-500">₹{PATIENT_PRO.mrpMonth}</s>
          </p>
          <p className="text-sm text-slate-300">
            {w.yearly} · {w.gst}
          </p>
          {pro.status === "none" && (
            <div className="mt-3 grid gap-2">
              {!usedTrial ? (
                <form action={startTrialAction}>
                  <button className="health-btn w-full" data-testid="pro-trial">
                    🎁 {w.trial}
                  </button>
                </form>
              ) : (
                <p className="text-xs text-slate-400">{w.trialUsed}</p>
              )}
              {buyHref && (
                <a href={buyHref} target="_blank" rel="noopener noreferrer" className="health-btn-ghost health-wa justify-center">
                  💬 {w.buy}
                </a>
              )}
              <p className="text-xs text-slate-400">{w.howPay}</p>
            </div>
          )}
        </div>
      </div>

      <table className="mt-5 w-full overflow-hidden rounded-2xl text-left text-sm">
        <thead>
          <tr className="bg-white/10 text-slate-200">
            <th className="p-2"></th>
            <th className="w-16 p-2 text-center">{w.basic}</th>
            <th className="w-16 p-2 text-center text-pink-200">{w.pro}</th>
          </tr>
        </thead>
        <tbody>
          {PATIENT_FEATURES.map((f) => (
            <tr key={f.en} className="border-b border-white/5">
              <td className="p-2 text-slate-200">
                <span aria-hidden>{f.emoji}</span> {lang === "hi" ? f.hi : f.en}
                {f.soon && <span className="ml-1 rounded-full bg-violet-500/30 px-2 py-0.5 text-[10px] font-bold text-violet-100">{w.soon}</span>}
              </td>
              <td className="p-2 text-center">{f.basic ? "✅" : "—"}</td>
              <td className="p-2 text-center">{f.pro ? (f.soon ? "⏳" : "✅") : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {pro.status !== "pro" && (
        <form action={activateAction} className="health-card mt-5 grid gap-2">
          <label htmlFor="code" className="text-sm font-semibold text-slate-300">
            🔑 {w.haveCode}
          </label>
          {sp.bad && <p className="text-sm text-red-300">{w.bad}</p>}
          <div className="flex gap-2">
            <input id="code" name="code" className="health-input" autoComplete="off" autoCapitalize="none" maxLength={700} required />
            <button className="health-btn">{w.activate}</button>
          </div>
        </form>
      )}

      <p className="mt-5 text-xs text-slate-400">🔒 {w.privacy}</p>
      <p className="mt-1 text-xs text-slate-500">ℹ️ {w.note}</p>
    </main>
  );
}
