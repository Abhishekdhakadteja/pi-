"use client";
import { useRef, useState, useTransition } from "react";
import { useT } from "@/components/LangProvider";
import { addExpense, deleteEntry, recordPayment } from "./actions";
import type { ErrorCode } from "@/lib/i18n";

const CATS = ["rent", "salary", "medicine_purchase", "electricity", "equipment", "other"] as const;
const KINDS = ["procedure", "medicine", "test", "consultation", "other"] as const;

function useForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [msg, setMsg] = useState<"saved" | ErrorCode | null>(null);
  const [pending, start] = useTransition();
  return { ref, msg, setMsg, pending, start };
}

export function ExpenseForm() {
  const { t } = useT();
  const f = useForm();
  return (
    <form
      ref={f.ref}
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        f.start(async () => {
          const r = await addExpense({ amount: String(d.get("amount") ?? ""), category: String(d.get("category")), note: String(d.get("note") ?? "") });
          f.setMsg(r.ok ? "saved" : r.error);
          if (r.ok) f.ref.current?.reset();
        });
      }}
    >
      <select name="category" className="input" aria-label={t("category")}>
        {CATS.map((c) => (
          <option key={c} value={c}>
            {t(`cat_${c}`)}
          </option>
        ))}
      </select>
      <input name="amount" className="input" inputMode="numeric" placeholder={t("amount")} required maxLength={8} />
      <input name="note" className="input" placeholder={t("note")} maxLength={300} />
      {f.msg && <p className={f.msg === "saved" ? "ok-box" : "error-box"}>{t(f.msg)}</p>}
      <button className="btn-primary" disabled={f.pending}>{f.pending ? t("loading") : t("addExpense")}</button>
    </form>
  );
}

export function IncomeForm() {
  const { t } = useT();
  const f = useForm();
  return (
    <form
      ref={f.ref}
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        f.start(async () => {
          const r = await recordPayment({
            amount: String(d.get("amount") ?? ""),
            kind: String(d.get("kind")),
            mode: String(d.get("mode")),
            note: String(d.get("note") ?? ""),
          });
          f.setMsg(r.ok ? "saved" : r.error);
          if (r.ok) f.ref.current?.reset();
        });
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <select name="kind" className="input" aria-label={t("category")}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`pkind_${k}`)}
            </option>
          ))}
        </select>
        <select name="mode" className="input" aria-label={t("byMode")}>
          <option value="cash">{t("mode_cash")}</option>
          <option value="upi">{t("mode_upi")}</option>
          <option value="card">{t("mode_card")}</option>
          <option value="other">{t("mode_other")}</option>
        </select>
      </div>
      <input name="amount" className="input" inputMode="numeric" placeholder={t("amount")} required maxLength={8} />
      <input name="note" className="input" placeholder={t("note")} maxLength={300} />
      {f.msg && <p className={f.msg === "saved" ? "ok-box" : "error-box"}>{t(f.msg)}</p>}
      <button className="btn-secondary" disabled={f.pending}>{f.pending ? t("loading") : t("addIncome")}</button>
    </form>
  );
}

export function DeleteEntry({ table, id }: { table: "payments" | "expenses"; id: string }) {
  const { t } = useT();
  const [pending, start] = useTransition();
  return (
    <button
      className="btn-small bg-white text-red-700"
      disabled={pending}
      aria-label={t("deleteWord")}
      onClick={() => {
        if (confirm(t("confirmDelete"))) start(() => deleteEntry(table, id).then(() => undefined));
      }}
    >
      ✕
    </button>
  );
}
