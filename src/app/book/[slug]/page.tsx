import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { readToken } from "@/lib/signed";
import { getT } from "@/lib/lang-server";
import { LangSwitch } from "@/components/LangSwitch";
import { getSession } from "./actions";
import { BookingFlow } from "./BookingFlow";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ r?: string }>;
}) {
  const { slug } = await params;
  const { r } = await searchParams;
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) notFound();
  const { data: clinic } = await supabaseAdmin().from("clinics").select("id, name").eq("slug", slug).maybeSingle();
  if (!clinic) notFound();
  const { t } = await getT();
  const session = await getSession(clinic.id);

  // Personal link from a reminder: the patient is known, but only AFTER the OTP step.
  const link = readToken<{ p: string; r: string }>(r);
  let preselect: string | null = null;
  if (session && link) {
    const { data } = await supabaseAdmin()
      .from("patients")
      .select("id")
      .eq("id", link.p)
      .eq("clinic_id", clinic.id)
      .eq("phone", session.phone)
      .maybeSingle();
    preselect = data?.id ?? null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xl font-bold text-teal-800">{clinic.name}</span>
        <LangSwitch />
      </div>
      <h1 className="text-2xl font-bold">{t("bookTitle")}</h1>
      <BookingFlow slug={slug} verifiedPhone={session?.phone ?? null} preselect={preselect} reminderToken={r ?? null} />
    </main>
  );
}
