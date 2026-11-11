"use client";
import { useRouter } from "next/navigation";
import { LANG_COOKIE } from "@/lib/i18n";
import { useT } from "./LangProvider";

export function LangSwitch() {
  const { lang, t } = useT();
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn-small border-2 border-teal-700 bg-white text-teal-800"
      onClick={() => {
        const next = lang === "hi" ? "en" : "hi";
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }}
      aria-label="Change language / भाषा बदलें"
    >
      {t("switchLang")}
    </button>
  );
}
