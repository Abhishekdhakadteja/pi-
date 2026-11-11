"use client";
import { useTransition } from "react";
import { useT } from "@/components/LangProvider";
import { markMissed } from "./actions";

export function MissedButton({ id }: { id: string }) {
  const { t } = useT();
  const [pending, start] = useTransition();
  return (
    <button
      className="btn-small border-2 border-red-300 bg-white text-red-700"
      disabled={pending}
      onClick={() => {
        if (confirm(t("confirmMissed"))) start(() => markMissed(id).then(() => undefined));
      }}
    >
      {t("markMissed")}
    </button>
  );
}
