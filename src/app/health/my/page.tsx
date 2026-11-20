import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getPatientPro } from "@/lib/health/patient-pro";
import { ProApp } from "./ProApp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "मेरी हेल्थ · Clinic Easy Health Pro", robots: { index: false } };

// Patient Pro app. Only for phones with an active Pro or trial cookie; others see the plan page.
export default async function MyHealthPage() {
  const pro = await getPatientPro();
  if (pro.status === "none") redirect("/health/pro");
  return <ProApp status={pro.status} until={pro.until} />;
}
