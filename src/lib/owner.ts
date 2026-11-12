import "server-only";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { isOwnerEmail, parseOwnerEmails } from "@/lib/owner-utils";

export type Owner = { id: string; email: string };

/**
 * The owner (the person who runs ClinicEase, not a clinic) is any logged-in user whose
 * email is listed in the OWNER_EMAILS environment variable. Empty = nobody, page hidden.
 */
export async function getOwner(): Promise<Owner | null> {
  const owners = parseOwnerEmails(process.env.OWNER_EMAILS);
  if (owners.length === 0) return null;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isOwnerEmail(user.email, owners)) return null;
  return { id: user.id, email: user.email.toLowerCase() };
}

/** For owner pages: logged out -> /login, logged in but not owner -> 404 (page stays secret). */
export async function requireOwner(): Promise<Owner> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const owner = await getOwner();
  if (!owner) notFound();
  return owner;
}

/** For owner server actions. */
export async function assertOwner(): Promise<Owner> {
  const owner = await getOwner();
  if (!owner) throw new Error("err_not_allowed");
  return owner;
}
