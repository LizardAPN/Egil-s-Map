"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { createBrowserClient, toApiError } from "@imprint/api";
import { Button, Input } from "@imprint/ui";

import { AuthShell } from "../../../components/auth/auth-shell";
import { authOfflineMessage, resolveAuthCatchError } from "../../../lib/auth-error";
import { formField } from "../../../lib/form-field";
import { safeRedirectPath } from "../../../lib/auth-redirect";

const GOOGLE_AUTH_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true";

function authErrorMessage(code: string): { message: string; showCode: boolean } {
  if (code === "invalid_credentials") {
    return { message: "Неверный email или пароль", showCode: false };
  }

  if (code === "config") {
    return {
      message: "Supabase не настроен. Проверь .env.local и перезапусти dev-сервер.",
      showCode: false,
    };
  }

  if (code === "offline") {
    return { message: authOfflineMessage(), showCode: false };
  }

  return {
    message: "Не удалось войти. Попробуй ещё раз?",
    showCode: true,
  };
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");

  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorCode(null);

    const formData = new FormData(event.currentTarget);
    const email = formField(formData, "email").trim();
    const password = formField(formData, "password");

    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const apiError = toApiError(error);
        setErrorCode(apiError.code);
        return;
      }

      router.push(safeRedirectPath(nextPath));
      router.refresh();
    } catch (caught) {
      setErrorCode(resolveAuthCatchError(caught));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    const supabase = createBrowserClient();
    const origin = window.location.origin;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=/map`,
      },
    });
  }

  const error = errorCode ? authErrorMessage(errorCode) : null;

  return (
    <AuthShell>
      <div className="space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="font-display text-3xl text-ink-cream">
            С возвращением
          </h1>
          <p className="text-sm text-ink-secondary">Продолжи свой путь</p>
        </header>

        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <label htmlFor="sign-in-email" className="text-sm text-ink-secondary">
              Email
            </label>
            <Input
              id="sign-in-email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="sign-in-password"
              className="text-sm text-ink-secondary"
            >
              Пароль
            </label>
            <Input
              id="sign-in-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {error ? (
            <div className="space-y-1" role="alert">
              <p className="text-sm text-danger">{error.message}</p>
              {error.showCode && errorCode ? (
                <p className="text-xs text-ink-muted">{errorCode}</p>
              ) : null}
            </div>
          ) : null}

          <Button type="submit" className="w-full" loading={loading}>
            Войти
          </Button>
        </form>

        <p className="text-center text-sm text-ink-secondary">
          Нет аккаунта?{" "}
          <Link href="/sign-up" className="text-ink-primary hover:underline">
            Создать
          </Link>
        </p>

        {GOOGLE_AUTH_ENABLED ? (
          <>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-line" />
              <span className="text-xs text-ink-muted">или</span>
              <div className="h-px flex-1 bg-line" />
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => void handleGoogleSignIn()}
            >
              Войти через Google
            </Button>
          </>
        ) : null}
      </div>
    </AuthShell>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<AuthShell><div className="h-40" /></AuthShell>}>
      <SignInForm />
    </Suspense>
  );
}
