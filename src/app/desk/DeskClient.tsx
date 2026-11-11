"use client";
import { useState, useTransition } from "react";
import { useT } from "@/components/LangProvider";
import { addPatient, bookPatient, searchPatients } from "./actions";
import { addDays, formatDate, formatTime, todayIST } from "@/lib/dates";
import { normalizePhone } from "@/lib/validate";
import type { BookResult, PatientSummary } from "@/lib/types";
import type { ErrorCode } from "@/lib/i18n";

type View = "search" | "add" | "patient" | "result";

export function DeskClient() {
  const { t, lang } = useT();
  const [view, setView] = useState<View>("search");
  const [phone, setPhone] = useState("");
  const [patients, setPatients] = useState<PatientSummary[] | null>(null);
  const [chosen, setChosen] = useState<PatientSummary | null>(null);
  const [booking, setBooking] = useState<BookResult | null>(null);
  const [otherDay, setOtherDay] = useState(false);
  const [day, setDay] = useState(addDays(todayIST(), 1));
  const [error, setError] = useState<ErrorCode | null>(null);
  const [pending, start] = useTransition();

  function run<T>(fn: () => Promise<T>, then: (v: T) => void) {
    setError(null);
    start(async () => {
      try {
        then(await fn());
      } catch {
        setError(navigator.onLine ? "err_generic" : ("err_network" as ErrorCode));
      }
    });
  }

  function reset() {
    setView("search");
    setPhone("");
    setPatients(null);
    setChosen(null);
    setBooking(null);
    setOtherDay(false);
    setError(null);
  }

  function doSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!normalizePhone(phone)) return setError("err_phone");
    run(
      () => searchPatients(phone),
      (r) => {
        if (!r.ok) return setError(r.error);
        setPhone(r.phone);
        setPatients(r.patients);
        setView(r.patients.length ? "search" : "add");
      },
    );
  }

  function doBook(date?: string) {
    if (!chosen) return;
    run(
      () => bookPatient(chosen.id, date),
      (r) => {
        if (!r.ok) return setError(r.error);
        setBooking(r.booking);
        setView("result");
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="error-box" role="alert">{t(error)}</p>}

      {view === "search" && (
        <>
          <form onSubmit={doSearch} className="card flex flex-col gap-3">
            <label className="label" htmlFor="phone">{t("searchByPhone")}</label>
            <input
              id="phone"
              className="input text-3xl tracking-wider"
              inputMode="numeric"
              autoComplete="off"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={16}
              autoFocus
            />
            <button className="btn-primary" disabled={pending}>{pending ? t("loading") : t("search")}</button>
          </form>

          {patients && patients.length > 0 && (
            <div className="card flex flex-col gap-3">
              <h2 className="text-xl font-bold">{t("choosePatient")}</h2>
              {patients.map((p) => (
                <button
                  key={p.id}
                  className="flex w-full items-center justify-between rounded-xl border-2 border-slate-200 p-4 text-left active:bg-teal-50"
                  onClick={() => {
                    setChosen(p);
                    setView("patient");
                  }}
                >
                  <span>
                    <span className="block text-xl font-semibold">{p.name}</span>
                    <span className="text-slate-600">
                      {p.age != null ? `${p.age} ${t("years")}` : ""} {p.gender ? `· ${t(p.gender as "male")}` : ""}
                    </span>
                  </span>
                  <span className="text-right text-sm text-slate-500">
                    {t("lastVisit")}
                    <br />
                    {p.last_visit ? formatDate(p.last_visit, lang) : t("never")}
                  </span>
                </button>
              ))}
              <button className="btn-secondary" onClick={() => setView("add")}>+ {t("addNewFamilyMember")}</button>
            </div>
          )}
        </>
      )}

      {view === "add" && (
        <AddPatientForm
          phone={phone}
          pending={pending}
          showNotFound={!patients?.length}
          onCancel={reset}
          onSubmit={(input) =>
            run(
              () => addPatient(input),
              (r) => {
                if (!r.ok) return setError(r.error);
                setChosen(r.patient);
                setView("patient");
              },
            )
          }
        />
      )}

      {view === "patient" && chosen && (
        <div className="card flex flex-col gap-4">
          <div>
            <div className="text-2xl font-bold">{chosen.name}</div>
            <div className="text-lg text-slate-600">
              {chosen.phone} {chosen.age != null ? `· ${chosen.age} ${t("years")}` : ""}
            </div>
          </div>
          <button className="btn-primary min-h-20 text-2xl" disabled={pending} onClick={() => doBook()}>
            {pending ? t("loading") : t("bookToday")}
          </button>
          {!otherDay ? (
            <button className="btn-secondary" onClick={() => setOtherDay(true)}>{t("bookAnotherDay")}</button>
          ) : (
            <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4">
              <label className="label" htmlFor="day">{t("pickDate")}</label>
              <input
                id="day"
                type="date"
                className="input"
                min={todayIST()}
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
              <button className="btn-primary" disabled={pending} onClick={() => doBook(day)}>{t("book")}</button>
            </div>
          )}
          <button className="btn-small text-slate-600 underline" onClick={reset}>{t("newSearch")}</button>
        </div>
      )}

      {view === "result" && booking && chosen && (
        <BookingResult
          booking={booking}
          name={chosen.name}
          pending={pending}
          onBookDay={(d) => doBook(d)}
          onDone={reset}
        />
      )}
    </div>
  );
}

function AddPatientForm({
  phone,
  pending,
  showNotFound,
  onSubmit,
  onCancel,
}: {
  phone: string;
  pending: boolean;
  showNotFound: boolean;
  onSubmit: (v: { name: string; phone: string; age: string; gender: string; address: string; consent: boolean }) => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const [consent, setConsent] = useState(false);
  const [localErr, setLocalErr] = useState<ErrorCode | null>(null);
  return (
    <form
      className="card flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        if (!consent) return setLocalErr("consentRequired");
        setLocalErr(null);
        onSubmit({
          name: String(f.get("name") ?? ""),
          phone: String(f.get("phone") ?? ""),
          age: String(f.get("age") ?? ""),
          gender: String(f.get("gender") ?? ""),
          address: String(f.get("address") ?? ""),
          consent,
        });
      }}
    >
      {showNotFound && <p className="text-lg text-slate-700">{t("noPatientFound")}</p>}
      <div>
        <label className="label" htmlFor="name">{t("name")}</label>
        <input id="name" name="name" className="input" required maxLength={120} autoFocus />
      </div>
      <div>
        <label className="label" htmlFor="newphone">{t("phone")}</label>
        <input id="newphone" name="phone" className="input" inputMode="numeric" defaultValue={phone} required maxLength={16} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="age">{t("age")}</label>
          <input id="age" name="age" className="input" inputMode="numeric" maxLength={3} />
        </div>
        <div>
          <label className="label" htmlFor="gender">{t("gender")}</label>
          <select id="gender" name="gender" className="input" defaultValue="">
            <option value="">-</option>
            <option value="male">{t("male")}</option>
            <option value="female">{t("female")}</option>
            <option value="other">{t("other")}</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="address">{t("address")}</label>
        <input id="address" name="address" className="input" maxLength={300} />
      </div>
      <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
        <input
          type="checkbox"
          name="consent"
          className="mt-1 h-7 w-7 shrink-0 accent-teal-700"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span className="text-lg">{t("consentText")}</span>
      </label>
      {localErr && <p className="error-box" role="alert">{t(localErr)}</p>}
      <button className="btn-primary" disabled={pending}>{pending ? t("loading") : t("addPatient")}</button>
      <button type="button" className="btn-small text-slate-600 underline" onClick={onCancel}>{t("cancel")}</button>
    </form>
  );
}

function BookingResult({
  booking,
  name,
  pending,
  onBookDay,
  onDone,
}: {
  booking: BookResult;
  name: string;
  pending: boolean;
  onBookDay: (d: string) => void;
  onDone: () => void;
}) {
  const { t, lang } = useT();
  if (booking.result === "full") {
    return (
      <div className="card flex flex-col gap-4 text-center">
        <p className="text-3xl font-bold text-red-700">{t("dayFull")}</p>
        {booking.next_free_day && (
          <>
            <p className="text-xl">
              {t("nextFreeDay")}: <b>{formatDate(booking.next_free_day, lang, true)}</b>
            </p>
            <button className="btn-primary" disabled={pending} onClick={() => onBookDay(booking.next_free_day!)}>
              {t("bookOn")} {formatDate(booking.next_free_day, lang, true)}
            </button>
          </>
        )}
        <button className="btn-secondary" onClick={onDone}>{t("newSearch")}</button>
      </div>
    );
  }
  if (booking.result !== "booked" && booking.result !== "existing") {
    return (
      <div className="card flex flex-col gap-4">
        <p className="error-box">{t(booking.result === "past" ? "err_past" : "err_slot_taken")}</p>
        <button className="btn-secondary" onClick={onDone}>{t("newSearch")}</button>
      </div>
    );
  }
  const a = booking.appointment;
  return (
    <div className="card flex flex-col items-center gap-2 text-center">
      {booking.result === "existing" && <p className="ok-box w-full">{t("alreadyBooked")}</p>}
      <div className="text-xl font-semibold">{name}</div>
      <div className="text-lg text-slate-600">{t("tokenNumber")}</div>
      <div className="text-[7rem] font-black leading-none text-teal-700" data-testid="token">{a.token_number}</div>
      <div className="text-2xl">
        {formatDate(a.date, lang, true)} · {formatTime(a.slot_time)}
      </div>
      <button className="btn-primary mt-4" onClick={onDone}>{t("newSearch")}</button>
    </div>
  );
}
