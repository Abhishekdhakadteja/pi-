"use client";
import { useState, useTransition } from "react";
import { useT } from "@/components/LangProvider";
import { updateClinic } from "./actions";
import type { ErrorCode } from "@/lib/i18n";

type Clinic = { name: string; address: string | null; phone: string | null; slots_per_day: number; opening_time: string; closing_time: string };

export function ClinicForm({ clinic }: { clinic: Clinic }) {
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
          const r = await updateClinic(f);
          setMsg(r.ok ? "saved" : r.error);
        });
      }}
    >
      <div>
        <label className="label" htmlFor="cname">{t("clinicName")}</label>
        <input id="cname" name="name" className="input" defaultValue={clinic.name} required maxLength={120} />
      </div>
      <div>
        <label className="label" htmlFor="caddr">{t("address")}</label>
        <input id="caddr" name="address" className="input" defaultValue={clinic.address ?? ""} maxLength={300} />
      </div>
      <div>
        <label className="label" htmlFor="cphone">{t("phone")}</label>
        <input id="cphone" name="phone" className="input" inputMode="numeric" defaultValue={clinic.phone ?? ""} maxLength={16} />
      </div>
      <div>
        <label className="label" htmlFor="slots">{t("slotsPerDay")}</label>
        <input id="slots" name="slots_per_day" className="input" inputMode="numeric" defaultValue={clinic.slots_per_day} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="open">{t("openingTime")}</label>
          <input id="open" name="opening_time" type="time" className="input" defaultValue={clinic.opening_time.slice(0, 5)} required />
        </div>
        <div>
          <label className="label" htmlFor="close">{t("closingTime")}</label>
          <input id="close" name="closing_time" type="time" className="input" defaultValue={clinic.closing_time.slice(0, 5)} required />
        </div>
      </div>
      {msg && <p className={msg === "saved" ? "ok-box" : "error-box"}>{t(msg)}</p>}
      <button className="btn-primary" disabled={pending}>{pending ? t("loading") : t("save")}</button>
    </form>
  );
}
