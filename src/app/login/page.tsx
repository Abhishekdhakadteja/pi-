import { redirect } from "next/navigation";
import { getT } from "@/lib/lang-server";
import { getStaff, ROLE_HOME } from "@/lib/staff";
import { LangSwitch } from "@/components/LangSwitch";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const staff = await getStaff();
  if (staff) redirect(ROLE_HOME[staff.role]);
  const { t } = await getT();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold text-teal-800">{t("appName")}</span>
        <LangSwitch />
      </div>
      <h1 className="text-3xl font-bold">{t("loginTitle")}</h1>
      <LoginForm />
    </main>
  );
}
