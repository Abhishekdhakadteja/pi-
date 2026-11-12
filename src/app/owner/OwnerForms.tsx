"use client";
import { useRef, useState, useTransition } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { createClinic, setClinicActive } from "./actions";

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
