import { createSupabaseMobileClient } from "@imprint/api/mobile";
import { formatNetworkAuthError } from "./supabase-dev-hint";

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

export function formatAuthError(error: unknown) {
  return formatNetworkAuthError(error);
}
