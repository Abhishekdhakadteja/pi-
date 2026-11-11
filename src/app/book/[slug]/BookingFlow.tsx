"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useT } from "@/components/LangProvider";
import { formatDate, formatTime } from "@/lib/dates";
import { normalizePhone } from "@/lib/validate";
import type { ErrorCode } from "@/lib/i18n";
import type { BookResult } from "@/lib/types";
import {
  addFamilyMember,
  confirmBooking,
  getCalendar,
  getDaySlots,
  getFamily,
  sendOtp,
  signOutPatient,
  verifyOtp,
  type FamilyMember,
} from "./actions";

type Step = "phone" | "otp" | "who" | "day" | "done";

export function BookingFlow({
  slug,
  verifiedPhone,
  preselect,
  reminderToken,
}: {
  slug: string;
  verifiedPhone: string | null;
  preselect: string | null;
  reminderToken: string | null;
}) {
  const { t, lang } = useT();
  const [step, setStep] = useState<Step>(verifiedPhone ? (preselect ? "day" : "who") : "phone");
  const [phone, setPhone] = useState(verifiedPhone ?? "");
  const [code, setCode] = useState("");
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [member, setMember] = useState<string | null>(preselect);
  const [adding, setAdding] = useState(false);
  const [days, setDays] = useState<{ day: string; free: number }[]>([]);
  const [day, setDay] = useState<string | null>(null);
  const [slots, setSlots] = useState<{ token: number; slot_time: string }[] | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [booking, setBooking] = useState<BookResult | null>(null);
  const [error, setError] = useState<ErrorCode | "err_network" | null>(null);
  const [pending, start] = useTransition();

  function run<R extends { ok: boolean }>(fn: () => Promise<R>, then: (v: Extract<R, { ok: true }>) => void) {
    setError(null);
    start(async () => {
      try {
        const r = await fn();
        if (!r.ok) {
          const e = (r as unknown as { error: ErrorCode }).error;
          setError(e);
          if (e === "err_session") setStep("phone");
          return;
        }
        then(r as Extract<R, { ok: true }>);
      } catch {
        setError(navigator.onLine ? "err_generic" : "err_network");
      }
    });
  }

  // Load data for the current step.
  useEffect(() => {
    if (step === "who") run(() => getFamily(slug), (r) => setMembers(r.members));
    if (step === "day") {
      run(() => getCalendar(slug), (r) => setDays(r.days));
      if (!members.length) getFamily(slug).then((r) => r.ok && setMembers(r.members)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const memberName = members.find((m) => m.id === member)?.name;

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="error-box" role="alert">{t(error as ErrorCode)}</p>}

      {step === "phone" && (
        <form
          className="card flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!normalizePhone(phone)) return setError("err_phone");
            run(() => sendOtp(slug, phone), (r) => {
              setPhone(r.phone);
              setStep("otp");
            });
          }}
        >
          <label className="label" htmlFor="pphone">{t("enterPhone")}</label>
          <div className="flex items-center gap-2">
            <span className="text-2xl text-slate-500">+91</span>
            <input
              id="pphone"
              className="input text-3xl tracking-wider"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={16}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
            />
          </div>
          <button className="btn-primary" disabled={pending}>{pending ? t("loading") : t("sendOtp")}</button>
        </form>
      )}

      {step === "otp" && (
        <form
          className="card flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => verifyOtp(slug, phone, code), () => {
              // Reminder link: reload so the server can pre-select the patient after OTP.
              if (reminderToken) window.location.reload();
              else setStep("who");
            });
          }}
        >
          <p className="text-lg text-slate-600">
            {t("otpSentTo")} +91 {phone}
          </p>
          <label className="label" htmlFor="otp">{t("enterOtp")}</label>
          <input
            id="otp"
            className="input text-center text-4xl tracking-[0.5em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            autoFocus
          />
          <button className="btn-primary" disabled={pending || code.length !== 6}>{pending ? t("loading") : t("verify")}</button>
          <button type="button" className="btn-small text-slate-600 underline" onClick={() => setStep("phone")}>
            {t("changeNumber")}
          </button>
        </form>
      )}

      {step === "who" && (
        <div className="card flex flex-col gap-3">
          <h2 className="text-xl font-bold">{t("whoIsVisiting")}</h2>
          {members.map((m) => (
            <button
              key={m.id}
              className={`flex items-center justify-between rounded-xl border-2 p-4 text-left text-xl ${member === m.id ? "border-teal-700 bg-teal-50" : "border-slate-200"}`}
              onClick={() => {
                setMember(m.id);
                setStep("day");
              }}
            >
              <span className="font-semibold">{m.name}</span>
              <span className="text-slate-500">{m.age != null ? `${m.age} ${t("years")}` : ""}</span>
            </button>
          ))}
          {!adding ? (
            <button className="btn-secondary" onClick={() => setAdding(true)}>
              + {members.length ? t("addNewFamilyMember") : t("addPatient")}
            </button>
          ) : (
            <AddMember
              pending={pending}
              onCancel={() => setAdding(false)}
              onSubmit={(v) =>
                run(() => addFamilyMember(slug, v), (r) => {
                  setMembers((ms) => [...ms, r.member]);
                  setMember(r.member.id);
                  setAdding(false);
                  setStep("day");
                })
              }
            />
          )}
          <button
            className="btn-small text-slate-600 underline"
            onClick={() => start(async () => { await signOutPatient(); setStep("phone"); })}
          >
            {t("changeNumber")}
          </button>
        </div>
      )}

      {step === "day" && (
        <div className="card flex flex-col gap-3">
          {memberName && <p className="text-lg">👤 <b>{memberName}</b></p>}
          <h2 className="text-xl font-bold">{t("pickDay")}</h2>
          <div className="grid grid-cols-4 gap-2" data-testid="calendar">
            {days.map((d) => {
              const full = d.free === 0;
              return (
                <button
                  key={d.day}
                  disabled={full}
                  className={`flex min-h-16 flex-col items-center justify-center rounded-xl border-2 p-1 text-sm ${
                    full ? "border-slate-100 bg-slate-100 text-slate-400" : day === d.day ? "border-teal-700 bg-teal-700 text-white" : "border-slate-200 bg-white"
                  }`}
                  onClick={() => {
                    setDay(d.day);
                    setSlot(null);
                    setSlots(null);
                    run(() => getDaySlots(slug, d.day), (r) => setSlots(r.slots));
                  }}
                >
                  <span className="font-semibold">{formatDate(d.day, lang, true)}</span>
                  {full && <span className="text-xs font-bold">{t("full")}</span>}
                </button>
              );
            })}
          </div>

          {day && slots && (
            <>
              <h3 className="mt-2 text-lg font-bold">{t("pickTime")}</h3>
              {slots.length === 0 ? (
                <p className="text-slate-500">{t("noFreeSlots")}</p>
              ) : (
                <div className="grid grid-cols-3 gap-2" data-testid="slots">
                  {slots.map((s) => (
                    <button
                      key={s.token}
                      className={`min-h-12 rounded-xl border-2 text-base font-semibold ${slot === s.token ? "border-teal-700 bg-teal-700 text-white" : "border-slate-200 bg-white"}`}
                      onClick={() => setSlot(s.token)}
                    >
                      {formatTime(s.slot_time)}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <button
            className="btn-primary mt-2"
            disabled={pending || !member || !day || !slot}
            onClick={() =>
              run(() => confirmBooking(slug, member!, day!, slot!, reminderToken), (r) => {
                if (r.booking.result === "slot_taken") {
                  setError("err_slot_taken");
                  run(() => getDaySlots(slug, day!), (s) => setSlots(s.slots));
                  return;
                }
                setBooking(r.booking);
                setStep("done");
              })
            }
          >
            {pending ? t("loading") : t("confirm")}
          </button>
          {!preselect && (
            <button className="btn-small text-slate-600 underline" onClick={() => setStep("who")}>{t("back")}</button>
          )}
        </div>
      )}

      {step === "done" && booking && (booking.result === "booked" || booking.result === "existing") && (
        <div className="card flex flex-col items-center gap-2 text-center" data-testid="confirmation">
          <p className={booking.result === "existing" ? "ok-box w-full" : "text-2xl font-bold text-green-700"}>
            {booking.result === "existing" ? t("showExistingBooking") : `✓ ${t("bookingConfirmed")}`}
          </p>
          <div className="mt-2 text-lg text-slate-600">{t("yourToken")}</div>
          <div className="text-[7rem] font-black leading-none text-teal-700" data-testid="token">{booking.appointment.token_number}</div>
          <div className="text-3xl font-bold">{formatDate(booking.appointment.date, lang, true)}</div>
          <div className="text-3xl font-bold">{formatTime(booking.appointment.slot_time)}</div>
          <Link
            className="btn-primary mt-4"
            href={`/queue/${slug}?t=${booking.appointment.token_number}&d=${booking.appointment.date}`}
          >
            {t("seeLiveQueue")}
          </Link>
        </div>
      )}
    </div>
  );
}

function AddMember({
  pending,
  onSubmit,
  onCancel,
}: {
  pending: boolean;
  onSubmit: (v: { name: string; age: string; consent: boolean }) => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState(false);
  return (
    <form
      className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!consent) return setErr(true);
        const f = new FormData(e.currentTarget);
        onSubmit({ name: String(f.get("name") ?? ""), age: String(f.get("age") ?? ""), consent });
      }}
    >
      <div>
        <label className="label" htmlFor="mname">{t("name")}</label>
        <input id="mname" name="name" className="input" required maxLength={120} />
      </div>
      <div>
        <label className="label" htmlFor="mage">{t("age")}</label>
        <input id="mage" name="age" className="input" inputMode="numeric" maxLength={3} />
      </div>
      <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
        <input type="checkbox" className="mt-1 h-7 w-7 shrink-0 accent-teal-700" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>{t("consentText")}</span>
      </label>
      {err && !consent && <p className="error-box">{t("consentRequired")}</p>}
      <button className="btn-primary" disabled={pending}>{t("addPatient")}</button>
      <button type="button" className="btn-small text-slate-600 underline" onClick={onCancel}>{t("cancel")}</button>
    </form>
  );
}
