"use client";

import { useState } from "react";

import { ApiError, createBrowserClient, createChapter } from "@imprint/api";
import {
  Button,
  compareMonths,
  Input,
  MonthPicker,
  monthValueToIsoDate,
  type MonthValue,
} from "@imprint/ui";

import {
  CHAPTER_COLORS,
  DEFAULT_CHAPTER_COLOR,
} from "../../../lib/chapter-colors";

export function ChapterStep({
  existingChapterId,
  onBack,
  onNext,
  onSkip,
}: {
  existingChapterId?: string | null;
  onBack: () => void;
  onNext: (chapterId: string) => void;
  onSkip: () => void;
}) {
  const [title, setTitle] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_CHAPTER_COLOR);
  const [showPeriod, setShowPeriod] = useState(false);
  const [startedAt, setStartedAt] = useState<MonthValue | null>(null);
  const [endedAt, setEndedAt] = useState<MonthValue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const periodInvalid =
    startedAt !== null &&
    endedAt !== null &&
    compareMonths(endedAt, startedAt) < 0;
  const canCreate = title.trim().length > 0 && !periodInvalid;

  async function handleCreate() {
    if (!canCreate) {
      return;
    }

    if (existingChapterId) {
      onNext(existingChapterId);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();
      const chapter = await createChapter(supabase, {
        title: title.trim(),
        color,
        startedAt: showPeriod && startedAt ? monthValueToIsoDate(startedAt) : null,
        endedAt: showPeriod && endedAt ? monthValueToIsoDate(endedAt) : null,
      });
      onNext(chapter.id);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "not_authenticated") {
        setError("Сессия истекла. Войди снова и продолжи онбординг.");
      } else {
        setError("Не удалось создать главу. Попробуй ещё раз?");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2 text-center">
        <h1 className="font-display text-3xl text-ink-cream">Первая глава</h1>
        <p className="text-sm text-ink-secondary">
          Глава — это период твоей жизни: город, путешествие, эпоха
        </p>
      </header>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="chapter-title" className="text-sm text-ink-secondary">
            Название
          </label>
          <Input
            id="chapter-title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            placeholder="Например: Мой 2026"
          />
        </div>

        <div className="space-y-2">
          <span className="text-sm text-ink-secondary">Цвет</span>
          <div className="flex flex-wrap gap-3">
            {CHAPTER_COLORS.map((chapterColor) => {
              const isSelected = color === chapterColor.hex;

              return (
                <button
                  key={chapterColor.id}
                  type="button"
                  aria-label={chapterColor.label}
                  aria-pressed={isSelected}
                  className={
                    isSelected
                      ? "h-[32px] w-[32px] rounded-full ring-2 ring-amber ring-offset-2 ring-offset-night-800"
                      : "h-[32px] w-[32px] rounded-full"
                  }
                  style={{ backgroundColor: chapterColor.hex }}
                  onClick={() => {
                    setColor(chapterColor.hex);
                  }}
                />
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            className="text-sm text-ink-secondary underline decoration-ink-muted underline-offset-4"
            onClick={() => {
              setShowPeriod((value) => !value);
            }}
          >
            Указать период
          </button>

          {showPeriod ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="chapter-start" className="text-sm text-ink-secondary">
                  Начало
                </label>
                <MonthPicker
                  id="chapter-start"
                  value={startedAt}
                  onChange={setStartedAt}
                  placeholder="Месяц"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="chapter-end" className="text-sm text-ink-secondary">
                  Конец
                </label>
                <MonthPicker
                  id="chapter-end"
                  value={endedAt}
                  onChange={setEndedAt}
                  min={startedAt ?? undefined}
                  placeholder="Месяц"
                  error={periodInvalid}
                  errorMessage="Конец не может быть раньше начала"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {existingChapterId ? (
        <p className="text-center text-sm text-ink-secondary">
          Глава уже создана — можешь продолжить или изменить название и создать новую
        </p>
      ) : null}

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
          Создать главу
        </Button>

        <button
          type="button"
          className="w-full text-center text-sm text-ink-muted underline underline-offset-4"
          onClick={onSkip}
        >
          Пока без главы
        </button>

        <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
          Назад
        </Button>
      </div>
    </div>
  );
}
