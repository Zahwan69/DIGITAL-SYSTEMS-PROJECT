import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const protectedPrefixes = ["/dashboard", "/papers", "/upload", "/teacher", "/admin"];
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role ?? "student";
    // Legacy 'admin' is treated as 'superadmin' until Phase 5 swaps the row.
    const isSuperadmin = role === "admin" || role === "superadmin";

    if (pathname.startsWith("/admin") && !isSuperadmin) {
      const redirectUrl = new URL(
        role === "teacher" ? "/teacher/dashboard" : "/dashboard",
        request.url
      );
      return NextResponse.redirect(redirectUrl);
    }

    if (pathname.startsWith("/teacher") && role !== "teacher") {
      const redirectUrl = new URL(
        isSuperadmin ? "/admin/dashboard" : "/dashboard",
        request.url
      );
      return NextResponse.redirect(redirectUrl);
    }

    // Teachers always land on the unified teacher dashboard, never the
    // student-only /dashboard page. Administration and tutor land on the
    // generic dashboard until their dedicated surfaces ship in Phase 2/3.
    if (pathname === "/dashboard" && role === "teacher") {
      return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|api/).*)"],
};
