import type { Metadata } from "next";
import { getLang } from "@/lib/lang-server";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Use · Clinic Easy",
  description: "Clinic Easy Terms of Use, in Hindi and English (DPDP Act 2023).",
};

export default async function Page() {
  return <LegalPage kind="terms" lang={await getLang()} />;
}
