import type { T } from "@/lib/i18n";

export function Counters({ total, done, remaining, t }: { total: number; done: number; remaining: number; t: T }) {
  const box = "card flex flex-col items-center p-3";
  return (
    <div className="grid grid-cols-3 gap-3" data-testid="counters">
      <div className={box}>
        <span className="text-4xl font-black" data-testid="count-total">{total}</span>
        <span className="text-slate-600">{t("total")}</span>
      </div>
      <div className={box}>
        <span className="text-4xl font-black text-green-700" data-testid="count-done">{done}</span>
        <span className="text-slate-600">{t("done")}</span>
      </div>
      <div className={box}>
        <span className="text-4xl font-black text-amber-600" data-testid="count-remaining">{remaining}</span>
        <span className="text-slate-600">{t("remaining")}</span>
      </div>
    </div>
  );
}

/** Remaining = everyone not yet done and not missed. */
export function countStatuses(rows: { status: string }[]) {
  const total = rows.length;
  const done = rows.filter((r) => r.status === "done").length;
  const missed = rows.filter((r) => r.status === "missed").length;
  return { total, done, remaining: total - done - missed };
}
