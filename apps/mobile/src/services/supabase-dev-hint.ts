const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function getSupabaseKeyDevHint(): string | null {
  if (!SUPABASE_ANON_KEY) {
    return "EXPO_PUBLIC_SUPABASE_ANON_KEY is missing in apps/mobile/.env";
  }

  if (SUPABASE_ANON_KEY.startsWith("sb_secret_")) {
    return "Do not use a secret key in the app. Use the publishable key or legacy anon key from Dashboard → Settings → API.";
  }

  if (SUPABASE_ANON_KEY.startsWith("sb_publishable_") && SUPABASE_ANON_KEY.length < 100) {
    return "Publishable key looks truncated. Copy the entire key from Dashboard → Settings → API (Publishable key).";
  }

  if (SUPABASE_ANON_KEY.startsWith("eyJ") && SUPABASE_ANON_KEY.length < 150) {
    return "Anon key looks truncated. Copy the full legacy anon key from Dashboard → Settings → API.";
  }

  return null;
}

export function getSupabaseUrlDevHint(): string | null {
  if (!SUPABASE_URL) {
    return "EXPO_PUBLIC_SUPABASE_URL is missing in apps/mobile/.env";
  }

  if (/127\.0\.0\.1|localhost/i.test(SUPABASE_URL)) {
    return (
      "Supabase URL points to this device (127.0.0.1). On a real phone use your PC's LAN IP, " +
      "e.g. http://192.168.1.13:54321, or use a cloud project URL (https://….supabase.co)."
    );
  }

  if (SUPABASE_URL.startsWith("http://") && !__DEV__) {
    return "Use https:// for production Supabase.";
  }

  return null;
}

export function formatNetworkAuthError(error: unknown): string {
  const devHint = getSupabaseUrlDevHint();

  if (error instanceof TypeError && error.message === "Network request failed") {
    if (devHint) {
      return devHint;
    }
    return "Can't reach Supabase. Check Wi‑Fi, URL in .env, and that the project is running.";
  }

  if (error instanceof Error) {
    if (error.message.toLowerCase().includes("session")) {
      return "Sign in to continue.";
    }
    if (error.message.toLowerCase().includes("anonymous sign-ins are disabled")) {
      return "Enter your email and password. Supabase treats an empty email as anonymous sign-in.";
    }
    if (
      error.message.toLowerCase().includes("email rate limit") ||
      error.message.toLowerCase().includes("over_email_send_rate_limit")
    ) {
      return (
        "Supabase stopped sending auth emails (about 2 per hour on the free default mailer). " +
        "Wait ~1 hour, sign in if you already registered, or in Dashboard → Authentication → Providers → Email " +
        "turn off Confirm email for dev. You can also add a user under Authentication → Users."
      );
    }
    if (error.message.toLowerCase().includes("invalid api key")) {
      const keyHint = getSupabaseKeyDevHint();
      if (keyHint) {
        return keyHint;
      }
      return (
        "Invalid Supabase API key. In Dashboard → Settings → API, copy the full publishable key " +
        "(sb_publishable_…) or legacy anon key (eyJ…) for this same project as EXPO_PUBLIC_SUPABASE_URL."
      );
    }
    return error.message;
  }

  return "Something went wrong. Try again?";
}
