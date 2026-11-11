"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LangProvider";
import { callNext, completeAndNext, saveCourse, saveVisit } from "./actions";
import { formatDate } from "@/lib/dates";
import type { ErrorCode } from "@/lib/i18n";

export function VisitForm({ appointmentId, notes, diagnosis }: { appointmentId: string; notes: string; diagnosis: string }) {
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
          const r = await saveVisit(appointmentId, String(f.get("notes") ?? ""), String(f.get("diagnosis") ?? ""));
          setMsg(r.ok ? "saved" : r.error);
        });
      }}
    >
      <label className="label" htmlFor="notes">{t("todaysNotes")}</label>
      <textarea id="notes" name="notes" className="input min-h-32 py-3 text-lg" defaultValue={notes} maxLength={8000} />
      <label className="label" htmlFor="diagnosis">{t("diagnosis")}</label>
      <input id="diagnosis" name="diagnosis" className="input" defaultValue={diagnosis} maxLength={1000} />
      {msg && <p className={msg === "saved" ? "ok-box" : "error-box"}>{t(msg)}</p>}
      <button className="btn-secondary" disabled={pending}>{pending ? t("loading") : t("saveNotes")}</button>
    </form>
  );
}

export function CourseForm({
  appointmentId,
  days,
  endDate,
  nextVisit,
}: {
  appointmentId: string;
  days: number | null;
  endDate: string | null;
  nextVisit: string | null;
}) {
  const { t, lang } = useT();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ end: string; next: string } | null>(
    endDate && nextVisit ? { end: endDate, next: nextVisit } : null,
  );
  const [error, setError] = useState<ErrorCode | null>(null);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const r = await saveCourse(appointmentId, String(f.get("days") ?? ""));
          if (r.ok) {
            setError(null);
            setResult({ end: r.end_date, next: r.next_visit_date });
          } else setError(r.error);
        });
      }}
    >
      <label className="label" htmlFor="days">{t("daysOfMedicine")}</label>
      <div className="flex gap-2">
        {[5, 7, 15, 30].map((d) => (
          <button
            key={d}
            type="button"
            className="btn-small flex-1 bg-teal-50 text-teal-900"
            onClick={(e) => {
              const input = (e.currentTarget.form as HTMLFormElement).elements.namedItem("days") as HTMLInputElement;
              input.value = String(d);
            }}
          >
            {d}
          </button>
        ))}
      </div>
      <input id="days" name="days" className="input" inputMode="numeric" defaultValue={days ?? ""} maxLength={3} />
      {error && <p className="error-box">{t(error)}</p>}
      {result && (
        <p className="ok-box" data-testid="course-result">
          {t("medicineEnds")}: <b>{formatDate(result.end, lang, true)}</b>
          <br />
          {t("nextVisit")}: <b>{formatDate(result.next, lang, true)}</b>
        </p>
      )}
      <button className="btn-secondary" disabled={pending}>{pending ? t("loading") : t("saveCourse")}</button>
    </form>
  );
}

export function CompleteButton({ appointmentId }: { appointmentId: string }) {
  const { t } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="btn-primary min-h-20 bg-green-700 text-3xl"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await completeAndNext(appointmentId);
          router.refresh();
        })
      }
    >
      {pending ? t("loading") : `✓ ${t("complete")}`}
    </button>
  );
}

export function CallNextButton() {
  const { t } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="btn-primary min-h-20 text-2xl"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await callNext();
          router.refresh();
        })
      }
    >
      {pending ? t("loading") : t("callNext")}
    </button>
  );
}
