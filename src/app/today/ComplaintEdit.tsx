"use client";
import { useState, useTransition } from "react";
import { useT } from "@/components/LangProvider";
import { ComplaintInput } from "@/components/ComplaintInput";
import { setComplaint } from "@/app/desk/actions";
import type { ErrorCode } from "@/lib/i18n";

/** Shows the reason for visit under a patient's name, with a small button to add or fix it. */
export function ComplaintEdit({ appointmentId, complaint }: { appointmentId: string; complaint: string | null }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(complaint ?? "");
  const [err, setErr] = useState<ErrorCode | null>(null);
  const [pending, start] = useTransition();
  if (!open)
    return (
      <button type="button" className="mt-1 block max-w-full text-left text-sm" onClick={() => setOpen(true)}>
        {complaint ? (
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-900 ring-1 ring-amber-200">🩺 {complaint}</span>
        ) : (
          <span className="text-teal-700 underline">+ {t("complaint")}</span>
        )}
      </button>
    );
  return (
    <div className="mt-2 flex flex-col gap-2 rounded-xl bg-slate-50 p-3">
      <ComplaintInput id={`c-${appointmentId}`} value={text} onChange={setText} />
      {err && <p className="error-box">{t(err)}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-small bg-white text-slate-600" onClick={() => setOpen(false)}>
          {t("cancel")}
        </button>
        <button
          type="button"
          className="btn-small bg-teal-700 text-white"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await setComplaint(appointmentId, text);
              if (r.ok) setOpen(false);
              else setErr(r.error);
            })
          }
        >
          {pending ? t("loading") : t("save")}
        </button>
      </div>
    </div>
  );
}
