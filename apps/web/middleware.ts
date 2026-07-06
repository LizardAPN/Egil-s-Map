import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseEnv } from "@imprint/api/env";
import type { Database } from "@imprint/types";

const PROTECTED_PREFIXES = [
  "/map",
  "/chapters",
  "/feed",
  "/settings",
  "/onboarding",
] as const;

const REQUIRES_ONBOARDING_PREFIXES = [
  "/map",
  "/chapters",
  "/feed",
  "/settings",
] as const;

const AUTH_ONLY_PREFIXES = ["/sign-in", "/sign-up"] as const;

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let supabaseResponse = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = matchesPrefix(pathname, PROTECTED_PREFIXES);
  const isAuthOnly = matchesPrefix(pathname, AUTH_ONLY_PREFIXES);
  const isOnboarding = matchesPrefix(pathname, ["/onboarding"]);
  const requiresOnboarding = matchesPrefix(
    pathname,
    REQUIRES_ONBOARDING_PREFIXES,
  );

  if (!user && isProtected) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/sign-in";
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (user && (isProtected || isAuthOnly || isOnboarding)) {
    const { data: profile, error } = await supabase
      .from("users")
      .select("is_onboarded")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return supabaseResponse;
    }

    const isOnboarded = profile?.is_onboarded ?? false;

    if (!isOnboarded && requiresOnboarding) {
      const onboardingUrl = request.nextUrl.clone();
      onboardingUrl.pathname = "/onboarding";
      onboardingUrl.search = "";
      return NextResponse.redirect(onboardingUrl);
    }

    if (isOnboarded && (isAuthOnly || isOnboarding)) {
      const mapUrl = request.nextUrl.clone();
      mapUrl.pathname = "/map";
      mapUrl.search = "";
      return NextResponse.redirect(mapUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/og|dev(?:/|$)).*)",
  ],
};
