"use server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";
import { makeToken, readToken } from "@/lib/signed";
import { clientIp, hashIp, turnstileOk } from "@/lib/otp-guard";
import { emailOtpReady, sendCodeEmail } from "@/lib/signup-otp";
import {
  RESET_MAX_ATTEMPTS,
  RESET_TTL_MIN,
  parseResetId,
  passwordProblem,
  resetLimited,
  type PasswordProblem,
  type ResetId,
} from "@/lib/password-reset";
import { findResetTarget, hashResetCode, hashResetId, newResetCode, resetCodeMatches } from "@/lib/password-reset-server";

// Public "forgot password". Nobody is logged in, so the service-role client is used and these
// checks are the security boundary:
//  - the reply is the same whether or not a login matches (no "this number is not registered"),
//    and takes about the same time;
//  - every request is counted per login typed and per device, so nobody can flood inboxes;
//  - the code is hashed, expires in 10 minutes, allows 5 tries and works once;
//  - the second step only works in the same browser (signed, http-only cookie).

export type RequestResult = { ok: true } | { ok: false; error: "id" | "human" | "rate" | "off" | "generic" };
export type ConfirmResult =
  | { ok: true; loginId: string }
  | { ok: false; error: "otp" | "otpExpired" | "session" | "mismatch" | PasswordProblem | "generic" };

const COOKIE = "ce_reset";
const COOKIE_TTL = 30 * 60;
const MIN_REPLY_MS = 1200;
type ResetCookie = { k: "email" | "phone"; v: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function setCookie(id: ResetId) {
  (await cookies()).set(COOKIE, makeToken({ k: id.kind, v: id.value }, COOKIE_TTL), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/login",
    maxAge: COOKIE_TTL,
  });
}

async function readCookie(): Promise<ResetId | null> {
  const c = readToken<ResetCookie>((await cookies()).get(COOKIE)?.value);
  return c && (c.k === "email" || c.k === "phone") && typeof c.v === "string" ? { kind: c.k, value: c.v } : null;
}

/** Counts, limits, then (only if a login matches) emails a fresh code. Same answer either way. */
async function issueCode(id: ResetId): Promise<RequestResult> {
  const db = supabaseAdmin();
  const idHash = hashResetId(id);
  const ipHash = hashIp(await clientIp());
  const now = Date.now();
  const tenAgo = new Date(now - 10 * 60_000).toISOString();
  const dayAgo = new Date(now - 24 * 60 * 60_000).toISOString();
  const count = async (col: "id_hash" | "ip_hash", value: string | null, since: string) => {
    if (!value) return 0;
    const { count: n, error } = await db
      .from("password_reset_otps")
      .select("id", { count: "exact", head: true })
      .eq(col, value)
      .gte("created_at", since);
    if (error) throw new Error(error.message);
    return n ?? 0;
  };
  const [id10, idDay, ip10, ipDay] = await Promise.all([
    count("id_hash", idHash, tenAgo),
    count("id_hash", idHash, dayAgo),
    count("ip_hash", ipHash, tenAgo),
    count("ip_hash", ipHash, dayAgo),
  ]);
  if (resetLimited({ id10, idDay, ip10, ipDay })) return { ok: false, error: "rate" };

  const target = await findResetTarget(db, id);
  const code = newResetCode();
  const expires = new Date(now + RESET_TTL_MIN * 60_000).toISOString();
  const { data: inserted, error } = await db.from("password_reset_otps").insert({
    id_hash: idHash,
    ip_hash: ipHash,
    user_id: target?.userId ?? null,
    target: target?.email ?? null,
    code_hash: target ? hashResetCode(target.userId, code) : null,
    expires_at: expires,
  }).select("id").single();
  if (error || !inserted) {
    console.error("reset: insert failed", error?.message);
    return { ok: false, error: "generic" };
  }
  if (target) {
    // Older codes for this login stop working: only the newest email counts.
    await db
      .from("password_reset_otps")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", target.userId)
      .is("used_at", null)
      .neq("id", inserted.id);
    if (!(await sendCodeEmail(target.email, code, "reset"))) console.error("reset: email not sent");
  }
  // Housekeeping: rows older than 2 days are not needed for any limit.
  await db.from("password_reset_otps").delete().lt("created_at", new Date(now - 2 * 24 * 60 * 60_000).toISOString());
  return { ok: true };
}

export async function requestPasswordReset(form: FormData): Promise<RequestResult> {
  const started = Date.now();
  try {
    if (!emailOtpReady()) return { ok: false, error: "off" };
    const id = parseResetId(form.get("id"));
    if (!id) return { ok: false, error: "id" };
    if (!(await turnstileOk(String(form.get("cf-turnstile-response") ?? ""), await clientIp()))) return { ok: false, error: "human" };
    const r = await issueCode(id);
    if (r.ok) await setCookie(id);
    return r;
  } catch (e) {
    console.error("reset: request failed", e instanceof Error ? e.message : e);
    return { ok: false, error: "generic" };
  } finally {
    // Same reply time whether or not an email went out, so timing does not reveal an account.
    const left = MIN_REPLY_MS - (Date.now() - started);
    if (left > 0) await sleep(left);
  }
}

export async function resendPasswordReset(): Promise<RequestResult> {
  const started = Date.now();
  try {
    const id = await readCookie();
    if (!id) return { ok: false, error: "generic" };
    return await issueCode(id);
  } catch {
    return { ok: false, error: "generic" };
  } finally {
    const left = MIN_REPLY_MS - (Date.now() - started);
    if (left > 0) await sleep(left);
  }
}

export async function confirmPasswordReset(form: FormData): Promise<ConfirmResult> {
  const id = await readCookie();
  if (!id) return { ok: false, error: "session" };
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (code.length !== 6) return { ok: false, error: "otp" };
  const basic = passwordProblem(password);
  if (basic) return { ok: false, error: basic };
  if (password !== confirm) return { ok: false, error: "mismatch" };

  const db = supabaseAdmin();
  const { data: row } = await db
    .from("password_reset_otps")
    .select("id, user_id, code_hash, expires_at, attempts")
    .eq("id_hash", hashResetId(id))
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) return { ok: false, error: "otpExpired" };
  if (row.attempts >= RESET_MAX_ATTEMPTS || new Date(row.expires_at) < new Date()) return { ok: false, error: "otpExpired" };
  if (!row.user_id || !resetCodeMatches(row.user_id, code, row.code_hash)) {
    await db.from("password_reset_otps").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    return { ok: false, error: "otp" };
  }

  // The code is right. Check the password against this person's own mobile/email before using it up.
  const { data: user } = await db.from("users").select("id, clinic_id, phone, email, active").eq("id", row.user_id).maybeSingle();
  if (!user?.active) return { ok: false, error: "otpExpired" };
  const personal = passwordProblem(password, { phone: user.phone, email: user.email });
  if (personal) return { ok: false, error: personal };

  // Use the code up first, so a second click cannot reuse it.
  const { data: claimed } = await db
    .from("password_reset_otps")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("used_at", null)
    .select("id");
  if (!claimed || claimed.length === 0) return { ok: false, error: "otpExpired" };

  const { error } = await db.auth.admin.updateUserById(user.id, { password });
  if (error) {
    console.error("reset: password update failed", error.message);
    return { ok: false, error: "generic" };
  }
  await db.from("password_reset_otps").update({ used_at: new Date().toISOString() }).eq("user_id", user.id).is("used_at", null);
  await db.from("audit_log").insert({
    clinic_id: user.clinic_id,
    user_id: user.id,
    action: "password_reset_otp",
    record_table: "users",
    record_id: user.id,
    details: { via: "email" },
  });
  (await cookies()).delete({ name: COOKIE, path: "/login" });
  return { ok: true, loginId: user.phone ?? user.email ?? "" };
}
