"use client";
import Link from "next/link";
import { useT } from "@/components/LangProvider";

// Friendly message for any unexpected error, in Hindi and English.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  const { t } = useT();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 text-center">
      <div className="text-5xl" aria-hidden>⚠️</div>
      <p className="text-2xl font-bold">{t("err_generic")}</p>
      <p className="text-lg text-slate-600">कुछ गड़बड़ हो गई। · Something went wrong.</p>
      <button className="btn-primary" onClick={reset}>↻</button>
      <Link className="btn-secondary" href="/">{t("home")}</Link>
    </main>
  );
}
