"use client";
import { useState } from "react";
import { useT } from "@/components/LangProvider";

/** Password box with an eye button, so staff can see what they typed. */
export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { t } = useT();
  const [show, setShow] = useState(false);
  const { className, ...rest } = props;
  return (
    <div className="relative">
      <input {...rest} type={show ? "text" : "password"} className={`${className ?? "input"} pr-16`} />
      <button
        type="button"
        className="absolute inset-y-0 right-1 my-1 flex w-14 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-teal-700"
        aria-label={show ? t("hidePassword") : t("showPassword")}
        aria-pressed={show}
        title={show ? t("hidePassword") : t("showPassword")}
        onClick={() => setShow((s) => !s)}
      >
        {show ? (
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
            <path d="M9.9 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
