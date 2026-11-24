"use client";
import { useActionState } from "react";
import Link from "next/link";
import { login, type LoginState } from "./actions";
import { useT } from "@/components/LangProvider";
import { PasswordInput } from "@/components/PasswordInput";

export function LoginForm({ initialId = "", resetDone = false }: { initialId?: string; resetDone?: boolean }) {
  const { t } = useT();
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="card flex flex-col gap-4">
      {resetDone && !state.error && <p className="ok-box">{t("passwordChanged")}</p>}
      <div>
        <label className="label" htmlFor="id">{t("emailOrPhone")}</label>
        <input id="id" name="id" className="input" autoComplete="username" required inputMode="email" defaultValue={initialId} />
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <label className="label" htmlFor="password">{t("password")}</label>
          <Link href="/login/forgot" className="text-sm font-semibold text-teal-700 underline underline-offset-4" data-testid="forgot-link">
            {t("forgotPassword")}
          </Link>
        </div>
        <PasswordInput id="password" name="password" className="input" autoComplete="current-password" required />
      </div>
      {state.error && (
        <p className="error-box" role="alert">
          {t(state.error)}
          {state.error === "loginFailed" && (
            <>
              {" "}
              <Link href="/login/forgot" className="font-semibold underline underline-offset-4">{t("forgotPassword")}</Link>
            </>
          )}
        </p>
      )}
      <button className="btn-primary" disabled={pending}>{pending ? t("loading") : t("login")}</button>
    </form>
  );
}
