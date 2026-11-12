"use client";
import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { useT } from "@/components/LangProvider";
import { PasswordInput } from "@/components/PasswordInput";

export function LoginForm() {
  const { t } = useT();
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="card flex flex-col gap-4">
      <div>
        <label className="label" htmlFor="id">{t("emailOrPhone")}</label>
        <input id="id" name="id" className="input" autoComplete="username" required inputMode="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">{t("password")}</label>
        <PasswordInput id="password" name="password" className="input" autoComplete="current-password" required />
      </div>
      {state.error && <p className="error-box" role="alert">{t(state.error)}</p>}
      <button className="btn-primary" disabled={pending}>{pending ? t("loading") : t("login")}</button>
    </form>
  );
}
