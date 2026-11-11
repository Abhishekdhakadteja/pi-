import type { T } from "@/lib/i18n";

const COLORS: Record<string, string> = {
  booked: "bg-slate-100 text-slate-700",
  waiting: "bg-amber-100 text-amber-800",
  in_room: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
  missed: "bg-red-100 text-red-700",
};

export function StatusBadge({ status, t }: { status: string; t: T }) {
  return (
    <span className={`rounded-lg px-2 py-1 text-sm font-semibold ${COLORS[status] ?? ""}`}>
      {t(`status_${status}` as "status_booked")}
    </span>
  );
}
