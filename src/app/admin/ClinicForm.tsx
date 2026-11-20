"use client";
import { useState, useTransition } from "react";
import { useT } from "@/components/LangProvider";
import { updateClinic } from "./actions";
import type { ErrorCode } from "@/lib/i18n";

type Clinic = {
  name: string;
  address: string | null;
  phone: string | null;
  slots_per_day: number;
  opening_time: string;
  closing_time: string;
  upi_id: string | null;
  default_fee: number;
  booking_otp: boolean;
  home_priority: boolean;
};

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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="upi">{t("upiId")}</label>
          <input id="upi" name="upi_id" className="input" defaultValue={clinic.upi_id ?? ""} placeholder="drname@okaxis" maxLength={130} autoCapitalize="none" />
        </div>
        <div>
          <label className="label" htmlFor="fee">{t("defaultFee")}</label>
          <input id="fee" name="default_fee" className="input" inputMode="numeric" defaultValue={clinic.default_fee} maxLength={6} />
        </div>
      </div>
      <label className="flex items-center gap-3 text-lg">
        <input type="checkbox" name="booking_otp" defaultChecked={clinic.booking_otp} className="h-6 w-6" />
        {t("bookingOtp")}
      </label>
      <label className="flex items-center gap-3 text-lg">
        <input type="checkbox" name="home_priority" defaultChecked={clinic.home_priority} className="h-6 w-6" />
        {t("homePriority")}
      </label>
      {msg && <p className={msg === "saved" ? "ok-box" : "error-box"}>{t(msg)}</p>}
      <button className="btn-primary" disabled={pending}>{pending ? t("loading") : t("save")}</button>
    </form>
  );
}
