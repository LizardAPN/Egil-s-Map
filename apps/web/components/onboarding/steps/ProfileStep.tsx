"use client";

import { IconCheck } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import {
  createBrowserClient,
  getMyProfile,
  isUsernameAvailable,
  updateMyProfile,
} from "@imprint/api";
import { Button, Input, Spinner } from "@imprint/ui";

import {
  isValidUsername,
  normalizeUsername,
} from "../../../lib/username";

type AvailabilityState = "idle" | "checking" | "available" | "taken";

export function ProfileStep({ onNext }: { onNext: () => void }) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [availability, setAvailability] =
    useState<AvailabilityState>("idle");
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();

    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return;
        }

        setUserId(user.id);

        const profile = await getMyProfile(supabase);

        if (profile) {
          setUsername(profile.username);
          setDisplayName(profile.displayName ?? "");
        } else if (user.email) {
          setDisplayName(user.email.split("@")[0] ?? "");
        }
      } finally {
        setInitLoading(false);
      }
    }

    void loadProfile();
  }, []);

  useEffect(() => {
    if (!isValidUsername(username) || !userId) {
      setAvailability("idle");
      return;
    }

    setAvailability("checking");

    const timer = window.setTimeout(() => {
      const supabase = createBrowserClient();

      void isUsernameAvailable(supabase, username, { excludeUserId: userId })
        .then((available) => {
          setAvailability(available ? "available" : "taken");
        })
        .catch(() => {
          setAvailability("idle");
        });
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [username, userId]);

  const usernameValid = isValidUsername(username);
  const displayNameValid = displayName.trim().length > 0;
  const canContinue =
    usernameValid &&
    displayNameValid &&
    availability === "available" &&
    !initLoading;

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canContinue) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();
      await updateMyProfile(supabase, {
        username,
        displayName: displayName.trim(),
      });
      onNext();
    } catch {
      setError("Не удалось сохранить профиль. Попробуй ещё раз?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={(event) => void handleSubmit(event)}>
      <header className="space-y-2 text-center">
        <h1 className="font-display text-3xl text-ink-cream">
          Как тебя зовут?
        </h1>
        <p className="text-sm text-ink-secondary">
          Так тебя увидят друзья на карте
        </p>
      </header>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="onboarding-username" className="text-sm text-ink-secondary">
            Имя пользователя
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
              @
            </span>
            <Input
              id="onboarding-username"
              value={username}
              onChange={(event) => {
                setUsername(normalizeUsername(event.target.value));
              }}
              className="pl-7 pr-10"
              autoComplete="username"
              maxLength={20}
              error={availability === "taken"}
              errorMessage={availability === "taken" ? "Имя занято" : undefined}
            />
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              {availability === "checking" ? (
                <Spinner size={16} className="text-ink-muted" />
              ) : null}
              {availability === "available" ? (
                <IconCheck size={16} className="text-success" aria-hidden />
              ) : null}
            </div>
          </div>
          {!usernameValid && username.length > 0 ? (
            <p className="text-xs text-ink-muted">
              От 3 до 20 символов: латиница, цифры и _
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="onboarding-display-name"
            className="text-sm text-ink-secondary"
          >
            Отображаемое имя
          </label>
          <Input
            id="onboarding-display-name"
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
            }}
            autoComplete="name"
          />
        </div>
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" loading={loading} disabled={!canContinue}>
        Дальше
      </Button>
    </form>
  );
}
