"use client";
import { useState, useTransition } from "react";
import { useT } from "@/components/LangProvider";
import { saveKnowledge } from "@/app/ai/knowledge-actions";

const W = {
  hi: {
    title: "AI मैनेजर को अपना क्लिनिक सिखाएँ",
    sub: "समय, फ़ीस, छुट्टी के दिन, नियम, मरीज़ों के आम सवाल-जवाब लिखें। AI मैनेजर हर जवाब में इन्हें ध्यान में रखेगा। मरीज़ का नाम, नंबर या बीमारी यहाँ न लिखें।",
    ph: "जैसे:\nरविवार बंद। OPD सुबह 10 से 2, शाम 5 से 8।\nफ़ीस ₹300, 7 दिन में दोबारा आने पर ₹100।\nशुगर के मरीज़ खाली पेट आएँ।",
    save: "सेव करें",
    saved: "सेव हो गया। AI मैनेजर अब यह जानता है।",
    err: { pro: "यह Pro में है", db: "पहले डेटाबेस अपडेट (SQL) चलाएँ", long: "4000 अक्षर तक ही" },
  },
  en: {
    title: "Teach the AI Manager your clinic",
    sub: "Write timings, fees, holidays, rules and common patient questions. The AI Manager keeps them in mind in every answer. Do not write patient names, numbers or illnesses here.",
    ph: "For example:\nClosed on Sunday. OPD 10-2 and 5-8.\nFee ₹300, ₹100 for a revisit within 7 days.\nDiabetic patients come fasting.",
    save: "Save",
    saved: "Saved. The AI Manager now knows this.",
    err: { pro: "This is in Pro", db: "Run the database update (SQL) first", long: "Up to 4000 characters" },
  },
};

export function KnowledgeForm({ initial }: { initial: string }) {
  const { lang } = useT();
  const w = W[lang];
  const [text, setText] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className="card mt-6 p-4" data-testid="ai-knowledge">
      <h2 className="text-xl font-bold">{w.title}</h2>
      <p className="mb-3 text-sm text-slate-400">{w.sub}</p>
      <textarea
        className="input min-h-36 py-3"
        value={text}
        maxLength={4000}
        placeholder={w.ph}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-1 text-right text-xs text-slate-500">{text.length}/4000</div>
      {msg && <p className={msg.ok ? "ok-box" : "error-box"}>{msg.t}</p>}
      <button
        className="btn-secondary mt-2"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await saveKnowledge(text);
            setMsg(r.ok ? { ok: true, t: w.saved } : { ok: false, t: w.err[r.error] });
          })
        }
      >
        {w.save}
      </button>
    </section>
  );
}
