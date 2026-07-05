import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/map";
  const oauthError = requestUrl.searchParams.get("error");
  const oauthErrorDescription = requestUrl.searchParams.get("error_description");

  if (oauthError) {
    const signInUrl = new URL("/sign-in", requestUrl.origin);
    signInUrl.searchParams.set("error", "auth");
    if (oauthErrorDescription) {
      signInUrl.searchParams.set("error_description", oauthErrorDescription);
    }
    return NextResponse.redirect(signInUrl);
  }

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in", requestUrl.origin));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/sign-in?error=auth", requestUrl.origin));
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", requestUrl.origin));
  }

  const { data: profile } = await supabase
    .from("users")
    .select("is_onboarded")
    .eq("id", user.id)
    .limit(1)
    .maybeSingle();

  const destination = profile?.is_onboarded ? next : "/onboarding";
  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}
