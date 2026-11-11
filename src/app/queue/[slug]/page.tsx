import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getT } from "@/lib/lang-server";
import { isValidDate } from "@/lib/validate";
import { formatDate, todayIST } from "@/lib/dates";
import { LangSwitch } from "@/components/LangSwitch";
import { QueueLive } from "./QueueLive";

export const dynamic = "force-dynamic";

// Public live queue. Shows only numbers, never names.
export default async function QueuePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string; d?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const token = Number(sp.t);
  const date = isValidDate(sp.d) ? sp.d : todayIST();
  if (!/^[a-z0-9-]{3,40}$/.test(slug) || !Number.isInteger(token) || token < 1 || token > 1000) notFound();
  const { data: clinic } = await supabaseAdmin().from("clinics").select("id, name").eq("slug", slug).maybeSingle();
  if (!clinic) notFound();
  const { t, lang } = await getT();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xl font-bold text-teal-800">{clinic.name}</span>
        <LangSwitch />
      </div>
      <p className="text-lg text-slate-600">{t("date")}: {formatDate(date, lang, true)}</p>
      <QueueLive clinicId={clinic.id} date={date} token={token} />
    </main>
  );
}
