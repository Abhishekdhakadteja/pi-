"use client";
import { useRef, useState, useTransition } from "react";
import { useT } from "@/components/LangProvider";
import { addStaff, setStaffActive } from "./actions";
import type { ErrorCode } from "@/lib/i18n";

export function AddStaffForm() {
  const { t } = useT();
  const ref = useRef<HTMLFormElement>(null);
  const [msg, setMsg] = useState<"saved" | ErrorCode | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      ref={ref}
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const r = await addStaff(f);
          setMsg(r.ok ? "saved" : r.error);
          if (r.ok) ref.current?.reset();
        });
      }}
    >
      <input name="name" className="input" placeholder={t("name")} required maxLength={120} />
      <select name="role" className="input" aria-label={t("role")} defaultValue="attender">
        <option value="attender">{t("role_attender")}</option>
        <option value="doctor">{t("role_doctor")}</option>
        <option value="admin">{t("role_admin")}</option>
      </select>
      <input name="phone" className="input" inputMode="numeric" placeholder={t("phone")} maxLength={16} />
      <input name="email" className="input" type="email" placeholder={`${t("emailWord")} (optional)`} maxLength={120} autoCapitalize="none" />
      <input name="password" className="input" type="password" placeholder={t("password")} required minLength={8} maxLength={72} autoComplete="new-password" />
      {msg && <p className={msg === "saved" ? "ok-box" : "error-box"}>{t(msg)}</p>}
      <button className="btn-primary" disabled={pending}>{pending ? t("loading") : t("addStaff")}</button>
    </form>
  );
}

export function ActiveToggle({ id, active }: { id: string; active: boolean }) {
  const { t } = useT();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<ErrorCode | null>(null);
  return (
    <span className="flex flex-col items-end">
      <button
        className={`btn-small ${active ? "border-2 border-red-300 bg-white text-red-700" : "bg-teal-700 text-white"}`}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await setStaffActive(id, !active);
            setErr(r.ok ? null : r.error);
          })
        }
      >
        {active ? t("removeStaff") : t("restoreStaff")}
      </button>
      {err && <span className="text-sm text-red-700">{t(err)}</span>}
    </span>
  );
}
