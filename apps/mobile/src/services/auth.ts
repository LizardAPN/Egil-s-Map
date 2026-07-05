import { createSupabaseMobileClient } from "@imprint/api/mobile";
import { stopBroadcasting } from "@imprint/api/presence";
import { formatNetworkAuthError } from "./supabase-dev-hint";
import { stopEchoBackgroundUpdates } from "./echoService";
import * as Linking from "expo-linking";

const MIN_PASSWORD_LENGTH = 6;
type OAuthProvider = "google" | "apple";

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
  const client = createSupabaseMobileClient();
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

export async function signInWithEmail(email: string, password: string) {
  const credentials = assertEmailPassword(email, password);
  const client = createSupabaseMobileClient();
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
  const client = createSupabaseMobileClient();
  const { data, error } = await client.auth.signUp({
    email: credentials.email,
    password: credentials.password
  });
  if (error) {
    throw error;
  }
  return data.session;
}

export async function startOAuthSignIn(provider: OAuthProvider) {
  const client = createSupabaseMobileClient();
  const redirectTo = Linking.createURL("/auth/callback");
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true
    }
  });

  if (error) {
    throw error;
  }

  if (!data.url) {
    throw new Error("Supabase did not return an OAuth URL.");
  }

  await Linking.openURL(data.url);
}

export async function exchangeOAuthCodeForSession(code: string) {
  const client = createSupabaseMobileClient();
  const { data, error } = await client.auth.exchangeCodeForSession(code);

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signOut() {
  const client = createSupabaseMobileClient();

  try {
    await stopBroadcasting();
  } catch {
    // Continue sign-out even if presence cleanup fails.
  } finally {
    await stopEchoBackgroundUpdates();
  }

  const { error } = await client.auth.signOut();
  if (error) {
    throw error;
  }
}

export function formatAuthError(error: unknown) {
  return formatNetworkAuthError(error);
}
