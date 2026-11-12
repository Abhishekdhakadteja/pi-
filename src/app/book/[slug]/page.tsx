import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getT } from "@/lib/lang-server";
import { LangSwitch } from "@/components/LangSwitch";
import { getSession, resolveReminderCode } from "./session";
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
  const { data: clinic } = await supabaseAdmin().from("clinics").select("id, name, booking_otp, home_priority").eq("slug", slug).maybeSingle();
  if (!clinic) notFound();
  const { t } = await getT();
  const session = await getSession(clinic.id);

  // Personal link from a reminder: the patient is known, but only AFTER the OTP step.
  // Without a session, a valid link asks only for the last 4 digits of the mobile number (free, no SMS).
  let preselect: string | null = null;
  let preselectName: string | null = null;
  let linkValid = false;
  if (r) {
    const link = await resolveReminderCode(clinic.id, r);
    linkValid = !!link;
    if (link && session) {
      const { data } = await supabaseAdmin()
        .from("patients")
        .select("id, name")
        .eq("id", link.patient_id)
        .eq("clinic_id", clinic.id)
        .eq("phone", session.phone)
        .maybeSingle();
      preselect = data?.id ?? null;
      preselectName = data?.name ?? null;
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xl font-bold text-teal-800">{clinic.name}</span>
        <LangSwitch />
      </div>
      <h1 className="text-2xl font-bold">{t("bookTitle")}</h1>
      <BookingFlow
        slug={slug}
        verifiedPhone={session?.phone ?? null}
        preselect={preselect}
        preselectName={preselectName}
        reminderToken={r ?? null}
        linkValid={linkValid}
        otpRequired={clinic.booking_otp}
        homePriority={clinic.home_priority}
      />
    </main>
  );
}
