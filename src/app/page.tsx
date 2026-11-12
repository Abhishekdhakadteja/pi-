import Link from "next/link";
import { getT } from "@/lib/lang-server";
import { LangSwitch } from "@/components/LangSwitch";
import { BrandMark } from "@/components/BrandMark";

export default async function Home() {
  const { t } = await getT();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col">
      <section className="relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-[#0b3b44] via-teal-800 to-emerald-600 px-5 pb-20 pt-6 text-white shadow-xl shadow-teal-950/20">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" aria-hidden />
        <div className="relative flex items-center justify-between">
          <span className="flex items-center gap-2 text-xl font-bold">
            <BrandMark size={36} />
            {t("appName")}
          </span>
          <span className="[&_button]:border-white/40 [&_button]:bg-white/10 [&_button]:text-white">
            <LangSwitch />
          </span>
        </div>
        <div className="relative mt-10 flex flex-col items-center text-center">
          <BrandMark size={72} />
          <h1 className="mt-4 text-4xl font-bold text-white">{t("appName")}</h1>
          <p className="mt-2 text-xl text-teal-50/90">{t("tagline")}</p>
        </div>
      </section>
      <div className="relative z-10 -mt-10 flex flex-col gap-4 px-4 pb-8">
        <div className="card text-center text-lg text-slate-600">{t("loginSubtitle")}</div>
        <Link href="/login" className="btn-primary">
          {t("staffLogin")}
        </Link>
      </div>
    </main>
  );
}
