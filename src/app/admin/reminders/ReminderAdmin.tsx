"use client";
import { useState, useTransition } from "react";
import { useT } from "@/components/LangProvider";
import { adminOptOut, saveTemplates } from "./actions";
import type { ErrorCode } from "@/lib/i18n";

export function TemplateForm({ hi, en, fhi, fen }: { hi: string; en: string; fhi: string; fen: string }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<"saved" | ErrorCode | null>(null);
  if (!open) return <button className="btn-secondary" onClick={() => setOpen(true)}>✎ {t("editWording")}</button>;
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const r = await saveTemplates(String(f.get("hi") ?? ""), String(f.get("en") ?? ""), String(f.get("fhi") ?? ""), String(f.get("fen") ?? ""));
          setMsg(r.ok ? "saved" : r.error);
        });
      }}
    >
      <p className="text-slate-600">{t("placeholdersHelp")}</p>
      <h3 className="text-lg font-bold">{t("firstTemplate")}</h3>
      <label className="label" htmlFor="thi">{t("messageHindi")}</label>
      <textarea id="thi" name="hi" className="input min-h-36 py-3 text-base" defaultValue={hi} maxLength={600} />
      <label className="label" htmlFor="ten">{t("messageEnglish")}</label>
      <textarea id="ten" name="en" className="input min-h-36 py-3 text-base" defaultValue={en} maxLength={600} />
      <h3 className="mt-2 text-lg font-bold">{t("followupTemplate")}</h3>
      <label className="label" htmlFor="fhi">{t("messageHindi")}</label>
      <textarea id="fhi" name="fhi" className="input min-h-36 py-3 text-base" defaultValue={fhi} maxLength={600} />
      <label className="label" htmlFor="fen">{t("messageEnglish")}</label>
      <textarea id="fen" name="fen" className="input min-h-36 py-3 text-base" defaultValue={fen} maxLength={600} />
      {msg && <p className={msg === "saved" ? "ok-box" : "error-box"}>{t(msg)}</p>}
      <button className="btn-primary" disabled={pending}>{t("save")}</button>
    </form>
  );
}

export function OptOutForm() {
  const { t } = useT();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<"saved" | ErrorCode | null>(null);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const r = await adminOptOut(String(f.get("phone") ?? ""));
          setMsg(r.ok ? "saved" : r.error);
        });
      }}
    >
      <label className="label" htmlFor="optphone">{t("optOutPatient")}</label>
      <input id="optphone" name="phone" className="input" inputMode="numeric" maxLength={16} required />
      {msg && <p className={msg === "saved" ? "ok-box" : "error-box"}>{t(msg)}</p>}
      <button className="btn-danger" disabled={pending}>{t("optOut")}</button>
    </form>
  );
}
