"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { passwordScore } from "@/lib/password-reset";
import { PasswordInput } from "@/components/PasswordInput";
import { Turnstile } from "@/components/Turnstile";
import { confirmPasswordReset, requestPasswordReset, resendPasswordReset } from "./actions";
import { RESET_WORDS } from "./words";

type Stage = { kind: "ask" } | { kind: "code" } | { kind: "done"; loginId: string };

const BAR = ["bg-rose-500", "bg-orange-400", "bg-amber-400", "bg-emerald-500", "bg-emerald-600"];

export function ResetForm({ lang, initialId = "" }: { lang: Lang; initialId?: string }) {
  const w = RESET_WORDS[lang];
  const [stage, setStage] = useState<Stage>({ kind: "ask" });
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [pending, start] = useTransition();
  const err = (k: string) => (w.errors as Record<string, string>)[k] ?? w.errors.generic;
  const noop = () => {};

  if (stage.kind === "done") {
    const phone = /^[6-9][0-9]{9}$/.test(stage.loginId) ? stage.loginId : "";
    return (
      <div className="card flex flex-col gap-4 text-center" data-testid="reset-done">
        <h2 className="text-2xl font-bold text-teal-800">{w.doneTitle}</h2>
        <p className="text-lg text-slate-600">{w.doneBody}</p>
        <Link href={`/login?reset=1${phone ? `&id=${phone}` : ""}`} className="btn-primary">
          {w.goLogin}
        </Link>
      </div>
    );
  }

  if (stage.kind === "code") {
    const score = passwordScore(pw);
    return (
      <form
        className="card flex flex-col gap-4"
        data-testid="reset-code"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setError(null);
          setNote(null);
          start(async () => {
            try {
              const r = await confirmPasswordReset(fd);
              if (r.ok) setStage({ kind: "done", loginId: r.loginId });
              else setError(err(r.error));
            } catch {
              setError(w.errors.generic);
            }
          });
        }}
      >
        <h2 className="text-2xl font-bold">{w.sentTitle}</h2>
        <p className="text-slate-600">{w.sentBody}</p>
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
        <div>
          <label className="label" htmlFor="password">{w.newPassword}</label>
          <PasswordInput
            id="password"
            name="password"
            className="input"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          {pw && (
            <div className="mt-2 flex items-center gap-2" aria-live="polite">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={`h-1.5 flex-1 rounded-full ${i < Math.max(score, 1) ? BAR[score] : "bg-slate-200"}`} />
                ))}
              </div>
              <span className="text-sm text-slate-600">{w.strength[score]}</span>
            </div>
          )}
          <p className="mt-1 text-sm text-slate-500">{w.passwordHint}</p>
        </div>
        <div>
          <label className="label" htmlFor="confirm">{w.confirmPassword}</label>
          <PasswordInput id="confirm" name="confirm" className="input" autoComplete="new-password" required minLength={8} maxLength={72} />
        </div>
        {error && <p className="error-box" role="alert">{error}</p>}
        {note && <p className="ok-box">{note}</p>}
        <button className="btn-primary" disabled={pending}>{pending ? w.wait : w.save}</button>
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={() => {
            setError(null);
            setNote(null);
            start(async () => {
              try {
                const r = await resendPasswordReset();
                if (r.ok) setNote(w.resent);
                else setError(err(r.error === "generic" ? "session" : r.error));
              } catch {
                setError(w.errors.generic);
              }
            });
          }}
        >
          {w.resend}
        </button>
        <button type="button" className="text-base text-teal-700 underline underline-offset-4" onClick={() => setStage({ kind: "ask" })}>
          {w.changeId}
        </button>
      </form>
    );
  }

  return (
    <form
      className="card flex flex-col gap-4"
      data-testid="reset-ask"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          try {
            const r = await requestPasswordReset(fd);
            if (r.ok) setStage({ kind: "code" });
            else setError(err(r.error));
          } catch {
            setError(w.errors.generic);
          }
        });
      }}
    >
      <div>
        <label className="label" htmlFor="id">{w.idLabel}</label>
        <input id="id" name="id" className="input" autoComplete="username" inputMode="email" required defaultValue={initialId} autoFocus />
        <p className="mt-1 text-sm text-slate-500">{w.idHint}</p>
      </div>
      {error && <p className="error-box" role="alert">{error}</p>}
      <Turnstile onToken={noop} lang={lang} />
      <button className="btn-primary" disabled={pending}>{pending ? w.wait : w.send}</button>
    </form>
  );
}
