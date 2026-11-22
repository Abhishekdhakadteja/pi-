"use server";
import { redirect } from "next/navigation";
import { activate, startTrial } from "@/lib/health/patient-pro";

export async function activateAction(form: FormData): Promise<void> {
  const raw = String(form.get("code") ?? "").trim();
  // Accept the whole activation link or just the code.
  const code = raw.includes("code=") ? decodeURIComponent(raw.split("code=")[1].split("&")[0]) : raw;
  if (!(await activate(code.slice(0, 600)))) redirect("/health/pro?bad=1");
  redirect("/health/my");
}

export async function startTrialAction(): Promise<void> {
  await startTrial();
  redirect("/health/my");
}
