"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createBrowserClient, toApiError } from "@imprint/api";
import { Button, Input } from "@imprint/ui";

import { AuthShell } from "../../../components/auth/auth-shell";
import { formField } from "../../../lib/form-field";

function signUpErrorMessage(code: string): { message: string; showCode: boolean } {
  switch (code) {
    case "user_already_exists":
      return { message: "Аккаунт с таким email уже есть", showCode: false };
    case "weak_password":
      return {
        message: "Пароль должен быть не короче 8 символов",
        showCode: false,
      };
    case "validation_failed":
      return { message: "Проверь формат email", showCode: false };
    case "config":
      return {
        message: "Supabase не настроен. Проверь .env.local и перезапусти dev-сервер.",
        showCode: false,
      };
    default:
      return {
        message: "Не удалось создать аккаунт. Попробуй ещё раз?",
        showCode: true,
      };
  }
}

export default function SignUpPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorCode(null);
    setConfirmError(null);

    const formData = new FormData(event.currentTarget);
    const email = formField(formData, "email").trim();
    const password = formField(formData, "password");
    const passwordConfirm = formField(formData, "passwordConfirm");

    if (password.length < 8) {
      setErrorCode("weak_password");
      return;
    }

    if (password !== passwordConfirm) {
      setConfirmError("Пароли не совпадают");
      return;
    }

    setLoading(true);

    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        const apiError = toApiError(error);
        setErrorCode(apiError.code);
        return;
      }

      if (data.session) {
        router.push("/onboarding");
        router.refresh();
        return;
      }

      setErrorCode("no_session");
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "unknown";
      setErrorCode(message.includes("Missing Supabase env") ? "config" : "unknown");
    } finally {
      setLoading(false);
    }
  }

  const error = errorCode ? signUpErrorMessage(errorCode) : null;

  return (
    <AuthShell>
      <div className="space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="font-display text-3xl text-ink-cream">
            Начни свою карту
          </h1>
        </header>

        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <label htmlFor="sign-up-email" className="text-sm text-ink-secondary">
              Email
            </label>
            <Input
              id="sign-up-email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="sign-up-password"
              className="text-sm text-ink-secondary"
            >
              Пароль
            </label>
            <Input
              id="sign-up-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <p className="text-xs text-ink-muted">Минимум 8 символов</p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="sign-up-password-confirm"
              className="text-sm text-ink-secondary"
            >
              Подтверди пароль
            </label>
            <Input
              id="sign-up-password-confirm"
              name="passwordConfirm"
              type="password"
              autoComplete="new-password"
              error={Boolean(confirmError)}
              errorMessage={confirmError ?? undefined}
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
            Создать аккаунт
          </Button>
        </form>

        <p className="text-center text-sm text-ink-secondary">
          Уже есть аккаунт?{" "}
          <Link href="/sign-in" className="text-ink-primary hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
