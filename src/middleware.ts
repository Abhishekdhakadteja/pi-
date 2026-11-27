import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { DEMO_COOKIE, demoCookieExp, isDemoEmail } from "@/lib/demo";

// Keeps the staff login session fresh, and sends logged-out visitors of staff pages to /login.
// Role checks happen on each page (see src/lib/staff.ts).
const STAFF_PREFIXES = ["/ai", "/desk", "/doctor", "/admin", "/reports", "/today", "/money", "/messages", "/rx", "/owner", "/pro"];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return res;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;

  // 5-minute demo: when its cookie is gone or expired, sign this browser out and show the end screen.
  if (user && isDemoEmail(user.email) && !path.startsWith("/demo")) {
    const exp = demoCookieExp(req.cookies.get(DEMO_COOKIE)?.value);
    if (!exp || exp * 1000 <= Date.now()) {
      await supabase.auth.signOut({ scope: "local" });
      const to = req.nextUrl.clone();
      to.pathname = "/demo";
      to.search = "?ended=1";
      const out = NextResponse.redirect(to);
      res.cookies.getAll().forEach((c) => out.cookies.set(c));
      out.cookies.delete(DEMO_COOKIE);
      return out;
    }
  }
  if (!user && STAFF_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) {
    const to = req.nextUrl.clone();
    to.pathname = "/login";
    to.search = "";
    return NextResponse.redirect(to);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|brand/|api/cron|api/webhooks|api/presence|api/errors|privacy|terms|sw.js|offline.html|book|queue|api/queue).*)"],
};
