"use client";
import { useState, useTransition } from "react";
import { useT } from "@/components/LangProvider";
import { recordPayment, updatePayment } from "@/app/money/actions";
import { upiLink } from "@/lib/share";
import { rupees } from "@/lib/money";
import { UpiQr } from "./UpiQr";
import type { ErrorCode } from "@/lib/i18n";

/** "Collect fee" for one appointment: cash or the clinic's own UPI QR (no gateway, no fee). */
export function FeeButton({
  appointmentId,
  defaultFee,
  upiId,
  payee,
  paid,
}: {
  appointmentId: string;
  defaultFee: number;
  upiId: string | null;
  payee: string;
  paid: { id: string; amount: number; discount: number; mode: string } | null;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(paid ? paid.amount : defaultFee || ""));
  const [discount, setDiscount] = useState(paid?.discount ? String(paid.discount) : "");
  const [mode, setMode] = useState<"cash" | "upi">(paid?.mode === "upi" ? "upi" : "cash");
  const [err, setErr] = useState<ErrorCode | null>(null);
  const [pending, start] = useTransition();

  if (paid !== null && !open)
    return (
      <span className="flex items-center gap-1">
        <span className="rounded-lg bg-green-50 px-2 py-1 text-sm font-semibold text-green-800 ring-1 ring-green-200">✓ {rupees(paid.amount)}</span>
        <button className="btn-small min-h-9 bg-white px-2 text-sm text-slate-500" onClick={() => setOpen(true)} title={t("fixFee")}>
          ✎ {t("fixFee")}
        </button>
      </span>
    );
  if (!open)
    return (
      <button className="btn-small border-2 border-teal-300 bg-white text-teal-800" onClick={() => setOpen(true)}>
        ₹ {t("collectFee")}
      </button>
    );
  const amt = Number(amount) || 0;
  return (
    <div className="mt-2 flex w-full flex-col gap-2 rounded-xl bg-slate-50 p-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm">
          {t("amount")}
          <input className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} maxLength={7} />
        </label>
        <label className="text-sm">
          {t("discount")}
          <input className="input" inputMode="numeric" value={discount} onChange={(e) => setDiscount(e.target.value)} maxLength={7} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(["cash", "upi"] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={`btn-small ${mode === m ? "bg-teal-700 text-white" : "bg-white text-slate-700"}`}
            onClick={() => setMode(m)}
          >
            {t(m === "cash" ? "mode_cash" : "mode_upi")}
          </button>
        ))}
      </div>
      {mode === "upi" &&
        (upiId ? (
          <div className="flex flex-col items-center gap-1 text-center">
            <UpiQr link={upiLink({ upiId, payee, amount: amt, note: "Clinic fee" })} />
            <span className="text-sm text-slate-600">{t("scanToPay")}</span>
          </div>
        ) : (
          <p className="text-sm text-amber-700">{t("noUpiId")}</p>
        ))}
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
              const r = paid
                ? await updatePayment(paid.id, { amount, discount, mode })
                : await recordPayment({ appointmentId, amount, discount, mode });
              if (!r.ok) setErr(r.error);
              else setOpen(false);
            })
          }
        >
          {pending ? t("loading") : `${paid ? t("save") : t("feePaid")} ${amt ? rupees(amt) : ""}`}
        </button>
      </div>
    </div>
  );
}
