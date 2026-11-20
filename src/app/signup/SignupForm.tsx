"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { SPECIALTIES } from "@/lib/signup";
import { PasswordInput } from "@/components/PasswordInput";
import { registerDoctor, resendSignupCode, verifySignupCode, type RegisterResult } from "./actions";
import { SIGNUP_WORDS } from "./words";

type Stage =
  | { kind: "form" }
  | { kind: "otp"; channel: "email" | "mobile"; to: string }
  | { kind: "team"; ref: string; whatsapp: string | null }
  | { kind: "done"; phone: string };

export function SignupForm({ lang, channels }: { lang: Lang; channels: { email: boolean; mobile: boolean } }) {
  const w = SIGNUP_WORDS[lang];
  const [stage, setStage] = useState<Stage>({ kind: "form" });
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState("");
  const [pending, start] = useTransition();
  const anyOtp = channels.email || channels.mobile;
  const err = (k: string) => (w.errors as Record<string, string>)[k] ?? w.errors.generic;

  if (stage.kind === "done") {
    return (
      <div className="card flex flex-col gap-4 text-center">
        <h2 className="text-2xl font-bold text-teal-800">{w.doneTitle}</h2>
        <p className="text-lg text-slate-600">{w.doneBody}</p>
        <Link href={`/login${stage.phone ? `?id=${stage.phone}` : ""}`} className="btn-primary">
          {w.goLogin}
        </Link>
      </div>
    );
  }

  if (stage.kind === "team") {
    return (
      <div className="card flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-teal-800">{w.teamTitle}</h2>
        <p className="text-lg text-slate-600">{w.teamBody}</p>
        <div className="rounded-2xl bg-teal-50 p-4 text-center">
          <div className="text-sm text-slate-500">{w.teamRef}</div>
          <div className="text-3xl font-bold tracking-widest text-teal-800">{stage.ref}</div>
        </div>
        {stage.whatsapp && (
          <a className="btn-primary" href={stage.whatsapp} target="_blank" rel="noopener noreferrer">
            {w.teamButton}
          </a>
        )}
        <Link href="/login" className="btn-secondary">
          {w.loginHere}
        </Link>
      </div>
    );
  }

  if (stage.kind === "otp") {
    return (
      <form
        className="card flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const code = String(new FormData(e.currentTarget).get("code") ?? "");
          setError(null);
          setNote(null);
          start(async () => {
            try {
              const r = await verifySignupCode(code);
              if (r.ok) setStage({ kind: "done", phone: r.phone });
              else setError(err(r.error));
            } catch {
              setError(w.errors.generic);
            }
          });
        }}
      >
        <h2 className="text-2xl font-bold">{w.otpTitle}</h2>
        <p className="text-slate-600">
          {w.otpSentTo} <b>{stage.to}</b>
        </p>
        <div>
          <label className="label" htmlFor="code">{w.otpLabel}</label>
          <input
            id="code"
            name="code"
            className="input text-center text-2xl tracking-[0.5em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            required
            autoFocus
          />
        </div>
        {error && <p className="error-box" role="alert">{error}</p>}
        {note && <p className="ok-box">{note}</p>}
        <button className="btn-primary" disabled={pending}>{pending ? w.wait : w.verify}</button>
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={() => {
            setError(null);
            setNote(null);
            start(async () => {
              try {
                const r = await resendSignupCode();
                if (r.ok) setNote(w.resent);
                else setError(err(r.error));
              } catch {
                setError(w.errors.generic);
              }
            });
          }}
        >
          {w.resend}
        </button>
      </form>
    );
  }

  return (
    <form
      className="card flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          try {
            const r: RegisterResult = await registerDoctor(f);
            if (!r.ok) setError(err(r.error));
            else if (r.mode === "otp") setStage({ kind: "otp", channel: r.channel, to: r.to });
            else setStage({ kind: "team", ref: r.ref, whatsapp: r.whatsapp });
          } catch {
            setError(w.errors.generic);
          }
        });
      }}
    >
      <h2 className="text-lg font-bold text-teal-800">{w.stepDoctor}</h2>
      <div>
        <label className="label" htmlFor="doctor_name">{w.doctorName}</label>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-slate-500">Dr.</span>
          <input id="doctor_name" name="doctor_name" className="input" placeholder={w.doctorNamePh} required maxLength={120} autoComplete="name" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="specialty">{w.specialty}</label>
        <select id="specialty" name="specialty" className="input" required value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
          <option value="" disabled>{w.specialtyPick}</option>
          {SPECIALTIES.map((s) => (
            <option key={s.key} value={s.key}>{s[lang]}</option>
          ))}
        </select>
      </div>
      {specialty === "other" && (
        <div>
          <label className="label" htmlFor="specialty_other">{w.specialtyOther}</label>
          <input id="specialty_other" name="specialty_other" className="input" required maxLength={60} />
        </div>
      )}
      <div>
        <label className="label" htmlFor="reg_no">{w.regNo}</label>
        <input id="reg_no" name="reg_no" className="input" maxLength={30} autoCapitalize="characters" />
        <p className="mt-1 text-sm text-slate-500">{w.regNoHint}</p>
      </div>

      <h2 className="mt-2 text-lg font-bold text-teal-800">{w.stepClinic}</h2>
      <div>
        <label className="label" htmlFor="clinic_name">{w.clinicName}</label>
        <input id="clinic_name" name="clinic_name" className="input" placeholder={w.clinicNamePh} required maxLength={120} />
      </div>
      <div>
        <label className="label" htmlFor="city">{w.city}</label>
        <input id="city" name="city" className="input" placeholder={w.cityPh} required maxLength={60} autoComplete="address-level2" />
      </div>

      <h2 className="mt-2 text-lg font-bold text-teal-800">{w.stepLogin}</h2>
      <div>
        <label className="label" htmlFor="phone">{w.phone}</label>
        <input id="phone" name="phone" className="input" inputMode="numeric" required maxLength={16} autoComplete="tel-national" placeholder="98XXXXXXXX" />
        <p className="mt-1 text-sm text-slate-500">{w.phoneHint}</p>
      </div>
      <div>
        <label className="label" htmlFor="email">{w.email}</label>
        <input id="email" name="email" type="email" className="input" required maxLength={120} autoComplete="email" autoCapitalize="none" placeholder="name@gmail.com" />
        <p className="mt-1 text-sm text-slate-500">{w.emailHint}</p>
      </div>
      <div>
        <label className="label" htmlFor="password">{w.password}</label>
        <PasswordInput id="password" name="password" className="input" required minLength={8} maxLength={72} autoComplete="new-password" />
        <p className="mt-1 text-sm text-slate-500">{w.passwordHint}</p>
      </div>

      {anyOtp ? (
        <fieldset>
          <legend className="label">{w.verifyBy}</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className={`flex items-center gap-2 rounded-xl border p-3 ${channels.mobile ? "" : "opacity-50"}`}>
              <input type="radio" name="channel" value="mobile" defaultChecked={channels.mobile} disabled={!channels.mobile} className="h-5 w-5" />
              <span>
                {w.viaMobile}
                {!channels.mobile && <span className="ml-1 text-xs">({w.soon})</span>}
              </span>
            </label>
            <label className={`flex items-center gap-2 rounded-xl border p-3 ${channels.email ? "" : "opacity-50"}`}>
              <input type="radio" name="channel" value="email" defaultChecked={!channels.mobile && channels.email} disabled={!channels.email} className="h-5 w-5" />
              <span>
                {w.viaEmail}
                {!channels.email && <span className="ml-1 text-xs">({w.soon})</span>}
              </span>
            </label>
          </div>
        </fieldset>
      ) : (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">{w.teamNote}</p>
      )}

      <label className="flex items-start gap-3">
        <input type="checkbox" name="public_listing" defaultChecked className="mt-1 h-5 w-5 shrink-0" />
        <span className="text-sm text-slate-700">{w.listing}</span>
      </label>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="terms" required className="mt-1 h-5 w-5 shrink-0" />
        <span className="text-sm text-slate-700">{w.terms}</span>
      </label>

      {error && <p className="error-box" role="alert">{error}</p>}
      <button className="btn-primary" disabled={pending}>{pending ? w.wait : w.submit}</button>
    </form>
  );
}
