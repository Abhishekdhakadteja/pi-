"use client";
import { useActionState } from "react";
import { startDemo, type DemoState } from "./actions";
import { track } from "@/lib/journey-client";

const W = {
  hi: {
    doctor: "🩺 डॉक्टर की नज़र से देखें",
    doctorSub: "आज के मरीज़, पर्ची, फीस, हिसाब, रिपोर्ट",
    desk: "🧾 रिसेप्शन (अटेंडर) की नज़र से",
    deskSub: "मरीज़ जोड़ना, टोकन, आज की लिस्ट, WhatsApp रिमाइंडर",
    starting: "डेमो शुरू हो रहा है…",
    limit: "इस फ़ोन/नेटवर्क से आज के डेमो पूरे हो गए। कल फिर आएँ, या WhatsApp पर हमसे लाइव डेमो लें।",
    busy: "आज बहुत लोग डेमो देख रहे हैं। थोड़ी देर बाद फिर कोशिश करें, या WhatsApp पर लिखें।",
    failed: "डेमो अभी शुरू नहीं हो पाया। एक बार फिर दबाएँ, या WhatsApp पर लिखें।",
  },
  en: {
    doctor: "🩺 See it as the doctor",
    doctorSub: "Today's patients, prescription, fees, accounts, reports",
    desk: "🧾 See it as the front desk",
    deskSub: "Add patient, tokens, today's list, WhatsApp reminders",
    starting: "Starting the demo…",
    limit: "Today's demos from this phone/network are used up. Come back tomorrow, or ask us for a live demo on WhatsApp.",
    busy: "Many people are trying the demo today. Try again a bit later, or message us on WhatsApp.",
    failed: "The demo could not start right now. Tap once more, or message us on WhatsApp.",
  },
} as const;

export function DemoStart({ lang, refTag }: { lang: "hi" | "en"; refTag: string | null }) {
  const w = W[lang];
  const [state, action, pending] = useActionState<DemoState, FormData>(startDemo, {});
  const btn = "flex w-full flex-col items-start rounded-2xl border p-4 text-left transition disabled:opacity-60";
  return (
    <form action={action} onSubmit={() => track("demo", refTag)} className="flex w-full flex-col gap-3">
      {refTag && <input type="hidden" name="ref" value={refTag} />}
      <button
        name="role"
        value="doctor"
        disabled={pending}
        className={`${btn} border-cyan-300/50 bg-gradient-to-r from-[#14d8b8]/20 via-[#22B8F5]/20 to-[#7c5cf6]/20 text-white hover:brightness-125`}
        data-testid="demo-doctor"
      >
        <span className="text-lg font-bold">{pending ? w.starting : w.doctor}</span>
        <span className="text-sm text-slate-300">{w.doctorSub}</span>
      </button>
      <button name="role" value="attender" disabled={pending} className={`${btn} border-white/15 bg-white/5 text-white hover:bg-white/10`} data-testid="demo-desk">
        <span className="text-lg font-bold">{w.desk}</span>
        <span className="text-sm text-slate-300">{w.deskSub}</span>
      </button>
      {state.error && <p className="error-box">{w[state.error]}</p>}
    </form>
  );
}
