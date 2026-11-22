"use client";
import { useTransition } from "react";
import { useT } from "@/components/LangProvider";
import { markArrived, markMissed } from "./actions";

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

export function ArrivedButton({ id }: { id: string }) {
  const { t } = useT();
  const [pending, start] = useTransition();
  return (
    <button
      className="btn-small bg-teal-700 px-4 font-bold text-white"
      disabled={pending}
      data-testid="arrived"
      onClick={() => start(() => markArrived(id).then(() => undefined))}
    >
      ✓ {t("arrived")}
    </button>
  );
}
