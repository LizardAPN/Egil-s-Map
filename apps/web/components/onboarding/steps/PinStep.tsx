"use client";

import { useState } from "react";

import { createBrowserClient, createPin } from "@imprint/api";
import type { PinLocation } from "@imprint/types";
import { Button, Input } from "@imprint/ui";

import { OnboardingMiniMap } from "../OnboardingMiniMap";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateToPinnedAt(date: string): string {
  return `${date}T12:00:00.000Z`;
}

export function PinStep({
  chapterId,
  onBack,
  onFinish,
}: {
  chapterId: string | null;
  onBack: () => void;
  onFinish: (pinId?: string) => Promise<void>;
}) {
  const [location, setLocation] = useState<PinLocation | null>(null);
  const [title, setTitle] = useState("");
  const [pinnedDate, setPinnedDate] = useState(todayIsoDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = location !== null && title.trim().length > 0;

  async function handleCreate() {
    if (!location || !canCreate) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();
      const pin = await createPin(supabase, {
        chapterId,
        location,
        title: title.trim(),
        visibility: "private",
        pinnedAt: dateToPinnedAt(pinnedDate),
      });
      await onFinish(pin.id);
    } catch {
      setError("Не удалось поставить пин. Попробуй ещё раз?");
      setLoading(false);
    }
  }

  async function handleSkip() {
    setLoading(true);
    setError(null);

    try {
      await onFinish();
    } catch {
      setError("Не удалось завершить онбординг. Попробуй ещё раз?");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2 text-center">
        <h1 className="font-display text-3xl text-ink-cream">Первый пин</h1>
        <p className="text-sm text-ink-secondary">
          Отметь место, с которого начинается твоя карта
        </p>
      </header>

      <OnboardingMiniMap location={location} onLocationChange={setLocation} />

      {location ? (
        <p className="text-center text-sm text-success">
          Точка выбрана — укажи название ниже
        </p>
      ) : (
        <p className="text-center text-sm text-ink-muted">
          Нажми на карту, чтобы отметить место
        </p>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="pin-title" className="text-sm text-ink-secondary">
            Название
          </label>
          <Input
            id="pin-title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            placeholder="Место, с которого всё началось"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="pin-date" className="text-sm text-ink-secondary">
            Дата
          </label>
          <input
            id="pin-date"
            type="date"
            value={pinnedDate}
            onChange={(event) => {
              setPinnedDate(event.target.value);
            }}
            className="h-10 w-full rounded-control border border-line bg-night-800 px-3 text-sm text-ink-primary focus:border-line-strong focus:outline-none focus:ring-1 focus:ring-amber/25"
          />
        </div>
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        <Button
          type="button"
          className="w-full"
          loading={loading}
          disabled={!canCreate}
          onClick={() => void handleCreate()}
        >
          Поставить пин
        </Button>

        <button
          type="button"
          className="w-full text-center text-sm text-ink-muted underline underline-offset-4"
          disabled={loading}
          onClick={() => void handleSkip()}
        >
          Сделаю позже
        </button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={loading}
          onClick={onBack}
        >
          Назад
        </Button>
      </div>
    </div>
  );
}
