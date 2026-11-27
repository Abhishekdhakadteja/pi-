"use client";
import { useMemo, useState } from "react";
import { LEAD_STAGES, leadMessage, type LeadStage } from "@/lib/funnel-messages";
import { waLink } from "@/lib/whatsapp";
import type { PlanId } from "@/lib/plans";

/**
 * Owner: the doctor-journey message for any stage, with the doctor's name (and check-up ₹ number)
 * filled in. One tap opens WhatsApp with it; nothing is sent until the owner presses Send there.
 */
export function LeadComposer({ appUrl }: { appUrl: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<LeadStage>("hello");
  const [amount, setAmount] = useState<number>(0);
  const [plan, setPlan] = useState<PlanId>("pro");
  const text = useMemo(() => leadMessage(stage, { appUrl, name, amount, plan }), [stage, appUrl, name, amount, plan]);
  const digits = phone.replace(/\D/g, "").slice(-10);
  const okPhone = /^[6-9]\d{9}$/.test(digits);
  const meta = LEAD_STAGES.find((s) => s.id === stage);
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input className="input" placeholder="Doctor का नाम (जैसे Sharma)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" inputMode="numeric" placeholder="WhatsApp नंबर (10 अंक)" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <select className="input" value={stage} onChange={(e) => setStage(e.target.value as LeadStage)} aria-label="Stage">
        {LEAD_STAGES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label} · {s.when}
          </option>
        ))}
      </select>
      {(stage === "day3" || stage === "paid_welcome") && (
        <div className="grid grid-cols-2 gap-2">
          {stage === "day3" && (
            <input className="input" type="number" min={0} placeholder="चेकअप का ₹/महीना (doctor ने बताया हो)" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
          )}
          <select className="input" value={plan} onChange={(e) => setPlan(e.target.value as PlanId)} aria-label="Plan">
            <option value="basic">Basic</option>
            <option value="pro">AI Pro</option>
            <option value="pro_max">Pro Max</option>
          </select>
        </div>
      )}
      <pre className="whitespace-pre-wrap rounded-xl bg-emerald-50 p-3 font-sans text-[13px] leading-relaxed text-slate-800 ring-1 ring-emerald-200" data-testid="lead-preview">
        {text}
      </pre>
      <a
        className={`btn-primary ${okPhone ? "" : "pointer-events-none opacity-50"}`}
        href={okPhone ? waLink(text, digits) : undefined}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="lead-send"
      >
        💬 WhatsApp पर खोलें ({meta?.label.split(". ")[1]})
      </a>
      <p className="text-xs text-slate-500">
        सिर्फ़ उन्हीं doctors को भेजें जिन्होंने ख़ुद लिखा या नंबर दिया। दिन 7 के बाद कोई मैसेज नहीं। &quot;STOP&quot; लिखे तो label STOP लगाएँ।
      </p>
    </div>
  );
}
