"use client";
import { useState, useTransition } from "react";
import { useT } from "@/components/LangProvider";
import { saveRx } from "./actions";
import { formatDate } from "@/lib/dates";
import type { ErrorCode } from "@/lib/i18n";

type Line = { medicine: string; dose: string; timing: string; days: string; note: string };
const EMPTY: Line = { medicine: "", dose: "", timing: "after_food", days: "", note: "" };
const DOSES = ["1-0-1", "1-1-1", "1-0-0", "0-0-1", "0-1-0"];

export function RxForm({
  appointmentId,
  initial,
}: {
  appointmentId: string;
  initial: { medicine: string; dose: string | null; timing: string | null; days: number; note: string | null }[];
}) {
  const { t, lang } = useT();
  const [lines, setLines] = useState<Line[]>(
    initial.length
      ? initial.map((l) => ({ medicine: l.medicine, dose: l.dose ?? "", timing: l.timing ?? "any", days: String(l.days), note: l.note ?? "" }))
      : [{ ...EMPTY }],
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState<ErrorCode | null>(null);
  const [done, setDone] = useState<{ end: string; next: string; wa: string } | null>(null);
  const set = (i: number, k: keyof Line, v: string) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-slate-500">{t("rxHelp")}</p>
      {lines.map((l, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3" data-testid={`rx-line-${i}`}>
          <div className="flex gap-2">
            <span className="pt-3 font-bold text-teal-700">{i + 1}.</span>
            <input className="input flex-1" placeholder={t("medicine")} value={l.medicine} onChange={(e) => set(i, "medicine", e.target.value)} maxLength={120} />
            {lines.length > 1 && (
              <button type="button" className="btn-small bg-white text-red-700" aria-label={t("removeLine")} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                ✕
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {DOSES.map((d) => (
              <button key={d} type="button" className={`btn-small ${l.dose === d ? "bg-teal-700 text-white" : "bg-white text-slate-700"}`} onClick={() => set(i, "dose", d)}>
                {d}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input className="input" placeholder={t("dose")} value={l.dose} onChange={(e) => set(i, "dose", e.target.value)} maxLength={40} />
            <select className="input" value={l.timing} onChange={(e) => set(i, "timing", e.target.value)} aria-label={t("timing")}>
              <option value="after_food">{t("timing_after_food")}</option>
              <option value="before_food">{t("timing_before_food")}</option>
              <option value="any">{t("timing_any")}</option>
            </select>
            <input className="input" inputMode="numeric" placeholder={t("daysWord")} value={l.days} onChange={(e) => set(i, "days", e.target.value)} maxLength={3} />
          </div>
          <input className="input" placeholder={t("note")} value={l.note} onChange={(e) => set(i, "note", e.target.value)} maxLength={200} />
        </div>
      ))}
      <button type="button" className="btn-small bg-teal-50 text-teal-900" onClick={() => setLines((ls) => [...ls, { ...EMPTY, days: ls.at(-1)?.days ?? "" }])}>
        {t("addMedicine")}
      </button>
      {error && <p className="error-box">{t(error)}</p>}
      {done && (
        <div className="flex flex-col gap-2">
          <p className="ok-box" data-testid="rx-result">
            {t("medicineEnds")}: <b>{formatDate(done.end, lang, true)}</b>
            <br />
            {t("nextVisit")}: <b>{formatDate(done.next, lang, true)}</b>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a href={done.wa} target="_blank" rel="noopener noreferrer" className="btn-small bg-green-600 text-center text-white">
              {t("sendRx")}
            </a>
            <a href={`/rx/${appointmentId}`} target="_blank" className="btn-small bg-white text-center text-slate-700">
              🖨 {t("printRx")}
            </a>
          </div>
        </div>
      )}
      <button
        type="button"
        className="btn-secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await saveRx(appointmentId, lines);
            if (r.ok) {
              setError(null);
              setDone({ end: r.end_date, next: r.next_visit_date, wa: r.wa });
            } else setError(r.error);
          })
        }
      >
        {pending ? t("loading") : t("saveRx")}
      </button>
    </div>
  );
}
