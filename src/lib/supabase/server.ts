import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, assertPublicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";

/** Client acting as the logged-in staff member. Row Level Security applies. */
export async function supabaseServer() {
  assertPublicEnv();
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are refreshed by middleware instead.
        }
      },
    },
  });
}

/**
 * Admin client with the service role key. Bypasses Row Level Security.
 * ONLY for server code that does its own checks: patient booking (after OTP),
 * the reminder job, and staff login by phone.
 */
export function supabaseAdmin() {
  assertPublicEnv();
  return createClient(SUPABASE_URL, serverEnv.serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
