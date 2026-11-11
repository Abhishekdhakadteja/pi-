import Link from "next/link";
import { getT } from "@/lib/lang-server";
import { LangSwitch } from "@/components/LangSwitch";

export default async function Home() {
  const { t } = await getT();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-teal-800">{t("appName")}</span>
        <LangSwitch />
      </div>
      <div className="card mt-8 text-center">
        <div className="text-5xl" aria-hidden>🩺</div>
        <h1 className="mt-3 text-3xl font-bold">{t("appName")}</h1>
        <p className="mt-2 text-xl text-slate-600">{t("tagline")}</p>
      </div>
      <Link href="/login" className="btn-primary">
        {t("staffLogin")}
      </Link>
    </main>
  );
}
