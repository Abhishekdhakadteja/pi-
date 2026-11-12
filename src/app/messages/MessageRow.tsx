"use client";
import { useState, useTransition } from "react";
import { useT } from "@/components/LangProvider";
import { markReminderSent, prepareReminders } from "./actions";

export function SendRow({ id, href }: { id: string; href: string }) {
  const { t } = useT();
  const [opened, setOpened] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="grid grid-cols-2 gap-2">
      <a href={href} target="_blank" rel="noopener noreferrer" className="btn-small bg-green-600 text-center text-white" onClick={() => setOpened(true)}>
        {t("sendOnWhatsApp")}
      </a>
      <button
        className={`btn-small ${opened ? "bg-teal-700 text-white" : "bg-white text-slate-700"}`}
        disabled={pending}
        onClick={() => start(() => markReminderSent(id).then(() => undefined))}
      >
        ✓ {t("markSent")}
      </button>
    </div>
  );
}

export function PrepareButton() {
  const { t } = useT();
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-1">
      <button className="btn-secondary" disabled={pending} onClick={() => start(async () => { await prepareReminders(); setDone(true); })}>
        {pending ? t("loading") : t("prepareNow")}
      </button>
      {done && <p className="ok-box">{t("preparedDone")}</p>}
    </div>
  );
}
