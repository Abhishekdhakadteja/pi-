"use client";
import { useState, useTransition } from "react";
import { makePatientProLink } from "./actions";

/** Owner: turn on Health Pro for a patient who paid ₹499/month by UPI. */
export function PatientProForm() {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<Awaited<ReturnType<typeof makePatientProLink>> | null>(null);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => setRes(await makePatientProLink(String(f.get("phone")), Number(f.get("months")))));
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="pp-phone">मरीज़ का मोबाइल</label>
          <input id="pp-phone" name="phone" className="input" inputMode="numeric" maxLength={14} required />
        </div>
        <div>
          <label className="label" htmlFor="pp-months">महीने</label>
          <select id="pp-months" name="months" className="input" defaultValue="1">
            <option value="1">1 (₹499)</option>
            <option value="3">3 (₹1,497)</option>
            <option value="6">6 (₹2,994)</option>
            <option value="12">12 (₹4,999 साल)</option>
          </select>
        </div>
      </div>
      <button className="btn-primary" disabled={pending}>{pending ? "..." : "एक्टिवेशन लिंक बनाएँ"}</button>
      {res && !res.ok && <p className="error-box">{res.error}</p>}
      {res && res.ok && (
        <div className="ok-box flex flex-col gap-2">
          <p>{res.until} तक चालू रहेगा। लिंक मरीज़ को WhatsApp पर भेजें:</p>
          <a href={res.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-primary">WhatsApp पर भेजें</a>
          <input className="input text-xs" readOnly value={res.link} onFocus={(e) => e.currentTarget.select()} />
        </div>
      )}
    </form>
  );
}
