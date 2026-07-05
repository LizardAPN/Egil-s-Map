"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  formatAuthError,
  signInWithEmail,
  signUpWithEmail,
  startGoogleOAuth
} from "../../lib/auth";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";
import { Button } from "../ui/Button";

async function routeAfterAuth(router: ReturnType<typeof useRouter>) {
  const client = createSupabaseBrowserClient();
  const { data: profile } = await client
    .from("users")
    .select("is_onboarded")
    .eq("id", (await client.auth.getUser()).data.user?.id ?? "")
    .limit(1)
    .maybeSingle();

  router.replace(profile?.is_onboarded ? "/map" : "/onboarding");
}

interface SignInFormProps {
  initialError?: string | null;
}

export function SignInForm({ initialError = null }: SignInFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(initialError);
  const [isEmailBusy, setIsEmailBusy] = useState(false);
  const [isGoogleBusy, setIsGoogleBusy] = useState(false);

  const handleSignIn = async () => {
    setInlineError(null);
    setIsEmailBusy(true);
    try {
      const session = await signInWithEmail(email, password);
      if (!session) {
        setInlineError("Check your email to confirm your account, then sign in.");
        return;
      }
      await routeAfterAuth(router);
    } catch (error) {
      setInlineError(formatAuthError(error));
    } finally {
      setIsEmailBusy(false);
    }
  };

  const handleSignUp = async () => {
    setInlineError(null);
    setIsEmailBusy(true);
    try {
      const session = await signUpWithEmail(email, password);
      if (!session) {
        setInlineError("Account created. Confirm your email if required, then sign in.");
        return;
      }
      await routeAfterAuth(router);
    } catch (error) {
      setInlineError(formatAuthError(error));
    } finally {
      setIsEmailBusy(false);
    }
  };

  const handleGoogle = async () => {
    setInlineError(null);
    setIsGoogleBusy(true);
    try {
      await startGoogleOAuth();
    } catch (error) {
      setInlineError(formatAuthError(error));
    } finally {
      setIsGoogleBusy(false);
    }
  };

  return (
    <div className="app-auth-card">
      <h1>Welcome back</h1>
      <p className="app-muted">Sign in to map your memories.</p>

      <label className="app-field">
        <span>Email</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          placeholder="you@example.com"
        />
      </label>

      <label className="app-field">
        <span>Password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
          placeholder="At least 6 characters"
        />
      </label>

      <p className="app-muted app-auth-hint">
        Email sign-in needs a valid address and a password of at least 6 characters.
      </p>

      {inlineError ? (
        <p className="app-error" role="alert">
          {inlineError}
        </p>
      ) : null}

      <div className="app-auth-actions">
        <Button disabled={isEmailBusy} onClick={handleSignIn}>
          {isEmailBusy ? "Signing in…" : "Sign in"}
        </Button>
        <Button variant="secondary" disabled={isEmailBusy} onClick={handleSignUp}>
          {isEmailBusy ? "Creating account…" : "Create account"}
        </Button>
        <Button variant="ghost" disabled={isGoogleBusy} onClick={handleGoogle}>
          {isGoogleBusy ? "Opening Google…" : "Continue with Google"}
        </Button>
      </div>
    </div>
  );
}
