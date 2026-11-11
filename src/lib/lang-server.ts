import "server-only";
import { cookies } from "next/headers";
import { LANG_COOKIE, isLang, makeT, type Lang } from "@/lib/i18n";

export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : "hi";
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: makeT(lang) };
}
