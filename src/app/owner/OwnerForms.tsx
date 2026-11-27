"use client";
import { useRef, useState, useTransition } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { approveSignup, createClinic, ownerResetPassword, rejectSignup, setClinicActive, setClinicPlan, type OwnerResetResult } from "./actions";

export function NewClinicForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ clinicName: string; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (done) {
    return (
      <div className="flex flex-col gap-3">
        <p className="ok-box">✓ {done.clinicName} तैयार है। नीचे का message doctor को भेजें, password अलग से बताएँ।</p>
        <textarea readOnly className="input min-h-48 py-3 text-base" value={done.message} />
        <div className="grid grid-cols-2 gap-3">
          <a className="btn-primary" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(done.message)}`}>
            WhatsApp पर भेजें
          </a>
          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(done.message);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
        <button type="button" className="btn-secondary" onClick={() => { setDone(null); setCopied(false); }}>
          + एक और clinic जोड़ें
        </button>
      </div>
    );
  }

  return (
    <form
      ref={ref}
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          try {
            const r = await createClinic(f);
            if (r.ok) {
              setDone({ clinicName: r.clinicName, message: r.message });
              ref.current?.reset();
            } else setError(r.error);
          } catch {
            setError("कुछ गड़बड़ हुई। Page refresh करके दोबारा login करें।");
          }
        });
      }}
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-bold text-teal-800">1. Clinic</legend>
        <input name="clinic_name" className="input" placeholder="Clinic का नाम (जैसे Sharma Clinic)" required maxLength={120} />
        <input name="address" className="input" placeholder="मोहल्ला / शहर" maxLength={300} />
        <div className="grid grid-cols-2 gap-3">
          <input name="clinic_phone" className="input" inputMode="numeric" placeholder="Clinic मोबाइल (optional)" maxLength={16} />
          <input name="default_fee" className="input" inputMode="numeric" placeholder="फ़ीस ₹ (optional)" maxLength={6} />
        </div>
        <input name="upi_id" className="input" placeholder="Doctor का UPI ID (optional, जैसे name@okicici)" maxLength={130} autoCapitalize="none" />
      </fieldset>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 mt-2 font-bold text-teal-800">2. Doctor (+ Admin login)</legend>
        <input name="doctor_name" className="input" placeholder="Doctor का नाम (Dr. के बिना)" required maxLength={120} />
        <input name="doctor_phone" className="input" inputMode="numeric" placeholder="Doctor मोबाइल (login)" required maxLength={16} />
        <input name="doctor_email" type="email" className="input" placeholder="Doctor email (Admin login)" required maxLength={120} autoCapitalize="none" />
        <PasswordInput name="doctor_password" className="input" placeholder="Password (कम से कम 8 अक्षर)" required minLength={8} maxLength={72} autoComplete="new-password" />
      </fieldset>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 mt-2 font-bold text-teal-800">3. Attender (optional)</legend>
        <input name="attender_name" className="input" placeholder="Attender का नाम" maxLength={120} />
        <input name="attender_phone" className="input" inputMode="numeric" placeholder="Attender मोबाइल (login)" maxLength={16} />
        <PasswordInput name="attender_password" className="input" placeholder="Attender password (8+ अक्षर)" minLength={8} maxLength={72} autoComplete="new-password" />
      </fieldset>
      {error && <p className="error-box">{error}</p>}
      <button className="btn-primary min-h-16 text-xl" disabled={pending}>
        {pending ? "बन रही है…" : "Clinic बनाएँ"}
      </button>
    </form>
  );
}

export function ClinicPauseButton({ clinicId, active }: { clinicId: string; active: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className="btn-small"
        disabled={pending}
        onClick={() => {
          const ask = active
            ? "इस clinic के सभी logins बंद हो जाएँगे (data सुरक्षित रहेगा)। बंद करें?"
            : "इस clinic के सभी logins फिर से चालू करें?";
          if (!window.confirm(ask)) return;
          start(async () => {
            const r = await setClinicActive(clinicId, !active);
            setError(r.ok ? null : (r.error ?? "Error"));
          });
        }}
      >
        {pending ? "…" : active ? "⏸ बंद करें" : "▶ चालू करें"}
      </button>
      {error && <span className="text-xs text-rose-700">{error}</span>}
    </div>
  );
}

/** Owner: switch Clinic Easy Pro on for N months after a UPI/cash payment, or off. */
export function ClinicPlanForm({ clinicId, label }: { clinicId: string; label: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [plan, setPlan] = useState<"basic" | "pro" | "pro_max">("pro");
  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState(2999);
  const [welcome, setWelcome] = useState<{ whatsapp: string; sent: boolean } | null>(null);
  return (
    <div className="mt-3 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
      <div className="mb-2 text-sm font-semibold text-amber-900">Pro: {label}</div>
      <div className="flex flex-wrap items-end gap-2 text-sm">
        <select className="input w-auto" value={plan} onChange={(e) => setPlan(e.target.value as "basic" | "pro" | "pro_max")} aria-label="Plan">
          <option value="basic">Basic (₹499)</option>
          <option value="pro">Pro</option>
          <option value="pro_max">Pro Max</option>
        </select>
        <select className="input w-auto" value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label="Months">
          {[1, 3, 6, 12, 0].map((m) => (
            <option key={m} value={m}>
              {m === 0 ? "बंद करें" : `${m} महीने`}
            </option>
          ))}
        </select>
        <input className="input w-28" type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} aria-label="₹ received" />
        <button
          type="button"
          className="btn-small bg-amber-500 text-white"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await setClinicPlan(clinicId, plan, months, amount);
              setWelcome(r.ok ? (r.welcome ?? null) : null);
              const name = plan === "basic" ? "Basic" : "Pro";
              setMsg(r.ok ? `✓ ${months === 0 ? "Pro बंद" : `${name} भुगतान दर्ज, ${r.until?.slice(0, 10)} तक`}` : (r.error ?? "Error"));
            })
          }
        >
          {pending ? "…" : "सेव"}
        </button>
      </div>
      {msg && <div className="mt-1 text-xs text-amber-900">{msg}</div>}
      {welcome &&
        (welcome.sent ? (
          <div className="mt-1 text-xs text-emerald-800">✓ Welcome मैसेज WhatsApp पर अपने आप चला गया।</div>
        ) : (
          <a className="btn-small mt-2 inline-flex bg-emerald-600 text-white" target="_blank" rel="noopener noreferrer" href={welcome.whatsapp} data-testid="welcome-whatsapp">
            🎉 Doctor को Welcome + डेमो लिंक WhatsApp पर भेजें
          </a>
        ))}
    </div>
  );
}

export function SignupReview({ clinicId }: { clinicId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ message: string; phone: string | null } | null>(null);
  if (done) {
    const href = done.phone
      ? `https://wa.me/91${done.phone}?text=${encodeURIComponent(done.message)}`
      : `https://wa.me/?text=${encodeURIComponent(done.message)}`;
    return (
      <div className="mt-3 flex flex-col gap-2">
        <p className="ok-box">✓ Account चालू। Doctor को बताएँ:</p>
        <a className="btn-primary" target="_blank" rel="noopener noreferrer" href={href}>
          WhatsApp पर बताएँ
        </a>
      </div>
    );
  }
  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={pending}
          onClick={() => {
            setError(null);
            start(async () => {
              const r = await approveSignup(clinicId).catch(() => ({ ok: false as const, error: "कुछ गड़बड़ हुई।" }));
              if (r.ok) setDone({ message: r.message, phone: r.phone });
              else setError(r.error);
            });
          }}
        >
          ✓ चालू करें
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={() => {
            if (!window.confirm("यह रजिस्ट्रेशन हमेशा के लिए हटाएँ?")) return;
            setError(null);
            start(async () => {
              const r = await rejectSignup(clinicId).catch(() => ({ ok: false, error: "कुछ गड़बड़ हुई।" }));
              if (!r.ok) setError(r.error ?? "हटाया नहीं जा सका।");
            });
          }}
        >
          ✕ हटाएँ
        </button>
      </div>
      {error && <p className="error-box">{error}</p>}
    </div>
  );
}

export function ResetPasswordForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Extract<OwnerResetResult, { ok: true }> | null>(null);
  if (done) {
    const href = done.phone
      ? `https://wa.me/91${done.phone}?text=${encodeURIComponent(done.message)}`
      : `https://wa.me/?text=${encodeURIComponent(done.message)}`;
    return (
      <div className="flex flex-col gap-3" data-testid="owner-reset-done">
        <p className="ok-box">
          ✓ {done.name} ({done.clinicName}) का पासवर्ड बदल दिया। यह पासवर्ड सिर्फ़ अभी दिख रहा है, दोबारा नहीं दिखेगा।
        </p>
        <div className="rounded-2xl bg-teal-50 p-4 text-center">
          <div className="text-sm text-slate-500">Login: {done.loginId}</div>
          <div className="select-all font-mono text-2xl font-bold tracking-wider text-teal-800">{done.password}</div>
        </div>
        <a className="btn-primary" target="_blank" rel="noopener noreferrer" href={href}>
          WhatsApp पर भेजें
        </a>
        <button type="button" className="btn-secondary" onClick={() => setDone(null)}>
          ठीक है, बंद करें
        </button>
      </div>
    );
  }
  return (
    <form
      ref={ref}
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        if (!window.confirm("पक्का? पुराना पासवर्ड तुरंत बंद हो जाएगा। पहले फ़ोन / WhatsApp पर पहचान ज़रूर जाँच लें।")) return;
        setError(null);
        start(async () => {
          const r = await ownerResetPassword(fd).catch(() => ({ ok: false as const, error: "कुछ गड़बड़ हुई।" }));
          if (r.ok) {
            ref.current?.reset();
            setDone(r);
          } else setError(r.error);
        });
      }}
    >
      <div>
        <label className="label" htmlFor="reset-id">Doctor / स्टाफ़ का login मोबाइल या ईमेल</label>
        <input id="reset-id" name="id" className="input" required inputMode="email" autoComplete="off" />
      </div>
      {error && <p className="error-box">{error}</p>}
      <button className="btn-primary" disabled={pending}>{pending ? "कृपया रुकें…" : "नया अस्थायी पासवर्ड बनाएँ"}</button>
    </form>
  );
}
