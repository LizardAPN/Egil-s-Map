import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/sign-in", "/auth/callback"];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) {
    return true;
  }

  if (pathname.startsWith("/api/")) {
    return true;
  }

  return false;
}

function isAppPath(pathname: string) {
  return (
    pathname.startsWith("/map") ||
    pathname.startsWith("/discover") ||
    pathname.startsWith("/live") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/create-pin") ||
    pathname.startsWith("/pin/") ||
    pathname.startsWith("/chapter/") ||
    pathname.startsWith("/edit-profile") ||
    pathname.startsWith("/settings")
  );
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers }
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && (isAppPath(pathname) || pathname.startsWith("/onboarding"))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === "/sign-in") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/map";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAppPath(pathname)) {
    const { data: profile } = await supabase
      .from("users")
      .select("is_onboarded")
      .eq("id", user.id)
      .limit(1)
      .maybeSingle();

    if (profile?.is_onboarded === false && !pathname.startsWith("/onboarding")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/onboarding";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (user && pathname.startsWith("/onboarding")) {
    const { data: profile } = await supabase
      .from("users")
      .select("is_onboarded")
      .eq("id", user.id)
      .limit(1)
      .maybeSingle();

    if (profile?.is_onboarded === true) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/map";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (!user && !isPublicPath(pathname) && !pathname.startsWith("/onboarding")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
