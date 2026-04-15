import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // We must build a fresh response object so Supabase can
  // write refreshed session cookies onto it before we return it.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read cookies from the incoming request
        getAll() {
          return request.cookies.getAll();
        },
        // Write refreshed cookies to both the request (for downstream
        // Server Components) and the response (sent back to the browser)
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the session token with Supabase's server.
  // Never use getSession() here — it trusts the cookie without verifying.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protect these route prefixes — any sub-path is also covered
  const protectedPrefixes = ["/dashboard", "/papers", "/upload"];
  const isProtected = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtected && !user) {
    const loginUrl = new URL("/auth/login", request.url);
    // Preserve the original URL so we can redirect back after login
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Always return supabaseResponse (not a plain NextResponse.next())
  // so the refreshed cookies are included
  return supabaseResponse;
}

export const config = {
  // Run on all routes except static files, images, and API routes
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|api/).*)"],
};
