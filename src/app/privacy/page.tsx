import type { Metadata } from "next";
import { getLang } from "@/lib/lang-server";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy · Clinic Easy",
  description: "Clinic Easy Privacy Policy, in Hindi and English (DPDP Act 2023).",
};

export default async function Page() {
  return <LegalPage kind="privacy" lang={await getLang()} />;
}
