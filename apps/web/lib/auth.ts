import { createSupabaseBrowserClient } from "@imprint/api/browser";
import { stopBroadcasting } from "@imprint/api/presence";
function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

const MIN_PASSWORD_LENGTH = 6;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function assertEmailPassword(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error("Enter your email address.");
  }

  if (!normalizedEmail.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  if (!password) {
    throw new Error("Enter your password.");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  return { email: normalizedEmail, password };
}

export async function getAuthSession() {
  const client = createSupabaseBrowserClient();
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

export async function signInWithEmail(email: string, password: string) {
  const credentials = assertEmailPassword(email, password);
  const client = createSupabaseBrowserClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password
  });
  if (error) {
    throw error;
  }
  return data.session;
}

export async function signUpWithEmail(email: string, password: string) {
  const credentials = assertEmailPassword(email, password);
  const client = createSupabaseBrowserClient();
  const { data, error } = await client.auth.signUp({
    email: credentials.email,
    password: credentials.password
  });
  if (error) {
    throw error;
  }
  return data.session;
}

export async function startGoogleOAuth() {
  const client = createSupabaseBrowserClient();
  const redirectTo = `${getAppUrl()}/auth/callback`;
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true
    }
  });

  if (error) {
    throw error;
  }

  if (!data.url) {
    throw new Error("Couldn't start Google sign-in. Try again?");
  }

  window.location.assign(data.url);
}

export async function exchangeOAuthCodeForSession(code: string) {
  const client = createSupabaseBrowserClient();
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error) {
    throw error;
  }
  return data.session;
}

export async function signOut() {
  const client = createSupabaseBrowserClient();

  try {
    await stopBroadcasting();
  } catch {
    // Continue sign-out even if presence cleanup fails.
  }

  const { error } = await client.auth.signOut();
  if (error) {
    throw error;
  }
}

function readAuthErrorMessage(error: unknown): string | null {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message: unknown }).message;
    return typeof message === "string" ? message : null;
  }

  if (typeof error === "string") {
    return error;
  }

  return null;
}

function isProviderDisabledMessage(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("provider is not enabled") ||
    normalized.includes("provider_disabled") ||
    normalized.includes("unsupported provider")
  );
}

export function formatAuthError(
  error: unknown,
  fallback = "Couldn't sign you in. Try again?"
) {
  const message = readAuthErrorMessage(error);

  if (message) {
    const normalized = message.toLowerCase();

    if (isProviderDisabledMessage(message)) {
      return (
        "Google sign-in isn't enabled for this Supabase project. " +
        "Use email and password below, or enable Google under Authentication → Providers in the Supabase Dashboard."
      );
    }

    if (normalized.includes("invalid login") || normalized.includes("invalid credentials")) {
      return "Couldn't sign you in. Check your email and password.";
    }
    if (normalized.includes("network") || normalized.includes("fetch")) {
      return "Couldn't reach the server. Check your connection and try again.";
    }
    if (normalized.includes("email rate limit") || normalized.includes("over_email_send_rate_limit")) {
      return (
        "Too many auth emails sent. Wait about an hour, sign in if you already registered, " +
        "or turn off Confirm email for dev in Dashboard → Authentication → Providers → Email."
      );
    }

    if (message.trim().startsWith("{") && message.includes("provider is not enabled")) {
      try {
        return formatAuthError(JSON.parse(message) as unknown);
      } catch {
        // Fall through to raw message.
      }
    }

    return message;
  }

  return fallback;
}

export function formatImprintError(
  error: unknown,
  fallback = "Couldn't save your progress. Try again?"
) {
  return formatAuthError(error, fallback);
}
