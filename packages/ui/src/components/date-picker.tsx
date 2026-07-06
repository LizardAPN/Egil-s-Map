"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { cn } from "../lib/cn";
import { MONTH_LABELS_RU } from "./month-picker";

export interface DateTimeValue {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface DatePickerProps {
  value?: DateTimeValue | null;
  onChange: (value: DateTimeValue) => void;
  showTime?: boolean;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
}

const WEEKDAY_LABELS_RU = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"] as const;

export function nowDateTimeValue(): DateTimeValue {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
  };
}

export function formatDateTimeDisplay(
  value: DateTimeValue,
  showTime = false,
): string {
  const monthLabel = MONTH_LABELS_RU[value.month - 1] ?? "";
  const day = String(value.day).padStart(2, "0");

  if (!showTime) {
    return `${day} ${monthLabel} ${String(value.year)}`;
  }

  const hour = String(value.hour).padStart(2, "0");
  const minute = String(value.minute).padStart(2, "0");

  return `${day} ${monthLabel} ${String(value.year)}, ${hour}:${minute}`;
}

export function dateTimeToIso(value: DateTimeValue): string {
  const month = String(value.month).padStart(2, "0");
  const day = String(value.day).padStart(2, "0");
  const hour = String(value.hour).padStart(2, "0");
  const minute = String(value.minute).padStart(2, "0");

  const local = new Date(
    `${String(value.year)}-${month}-${day}T${hour}:${minute}:00`,
  );

  return local.toISOString();
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getMondayBasedOffset(year: number, month: number): number {
  const firstDay = new Date(year, month - 1, 1).getDay();
  return firstDay === 0 ? 6 : firstDay - 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeTimeDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 2);
}

export function DatePicker({
  value,
  onChange,
  showTime = false,
  placeholder = "Дата",
  id: idProp,
  disabled = false,
  error = false,
  errorMessage,
}: DatePickerProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const errorId = error && errorMessage ? `${id}-error` : undefined;
  const gridRef = useRef<HTMLDivElement>(null);
  const hourInputRef = useRef<HTMLInputElement>(null);
  const minuteInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [hourDraft, setHourDraft] = useState<string | null>(null);
  const [minuteDraft, setMinuteDraft] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(
    () => value?.year ?? nowDateTimeValue().year,
  );
  const [viewMonth, setViewMonth] = useState(
    () => value?.month ?? nowDateTimeValue().month,
  );
  const [focusedDay, setFocusedDay] = useState(() => value?.day ?? 1);

  const focusDayButton = useCallback((day: number) => {
    const button = gridRef.current?.querySelector<HTMLButtonElement>(
      `[data-day="${String(day)}"]`,
    );
    button?.focus();
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const initial = value ?? nowDateTimeValue();
    setViewYear(initial.year);
    setViewMonth(initial.month);
    setFocusedDay(initial.day);

    requestAnimationFrame(() => {
      focusDayButton(initial.day);
    });
  }, [open, value, focusDayButton]);

  useEffect(() => {
    const hourFocused = document.activeElement === hourInputRef.current;
    const minuteFocused = document.activeElement === minuteInputRef.current;

    if (!hourFocused) {
      setHourDraft(null);
    }

    if (!minuteFocused) {
      setMinuteDraft(null);
    }
  }, [value]);

  const totalDays = daysInMonth(viewYear, viewMonth);
  const offset = getMondayBasedOffset(viewYear, viewMonth);

  function handleSelectDay(day: number) {
    const next: DateTimeValue = {
      year: viewYear,
      month: viewMonth,
      day,
      hour: value?.hour ?? 12,
      minute: value?.minute ?? 0,
    };
    onChange(next);

    if (!showTime) {
      setOpen(false);
    }
  }

  function handleToday() {
    const today = nowDateTimeValue();
    onChange(today);
    if (!showTime) {
      setOpen(false);
    }
  }

  function stepMonth(delta: number) {
    let nextMonth = viewMonth + delta;
    let nextYear = viewYear;

    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    } else if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }

    const maxDay = daysInMonth(nextYear, nextMonth);
    const nextDay = clamp(focusedDay, 1, maxDay);

    setViewYear(nextYear);
    setViewMonth(nextMonth);
    setFocusedDay(nextDay);

    requestAnimationFrame(() => {
      focusDayButton(nextDay);
    });
  }

  function getBaseValue(): DateTimeValue {
    return value ?? nowDateTimeValue();
  }

  function commitHour(raw: string, advanceToMinute = false) {
    const trimmed = raw.trim();

    if (trimmed === "") {
      setHourDraft(null);
      return;
    }

    const parsed = Number.parseInt(trimmed, 10);

    if (Number.isNaN(parsed)) {
      setHourDraft(null);
      return;
    }

    const base = getBaseValue();
    onChange({ ...base, hour: clamp(parsed, 0, 23) });
    setHourDraft(null);

    if (advanceToMinute) {
      requestAnimationFrame(() => {
        minuteInputRef.current?.focus();
        minuteInputRef.current?.select();
      });
    }
  }

  function commitMinute(raw: string) {
    const trimmed = raw.trim();

    if (trimmed === "") {
      setMinuteDraft(null);
      return;
    }

    const parsed = Number.parseInt(trimmed, 10);

    if (Number.isNaN(parsed)) {
      setMinuteDraft(null);
      return;
    }

    const base = getBaseValue();
    onChange({ ...base, minute: clamp(parsed, 0, 59) });
    setMinuteDraft(null);
  }

  function commitPendingTimeDrafts() {
    if (hourDraft !== null) {
      commitHour(hourDraft);
    }

    if (minuteDraft !== null) {
      commitMinute(minuteDraft);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && showTime) {
      commitPendingTimeDrafts();
    }

    setOpen(nextOpen);
  }

  function handleHourDraftChange(raw: string) {
    const next = sanitizeTimeDigits(raw);
    const shouldAdvance =
      next.length === 2 || (next.length === 1 && Number(next) > 2);

    if (shouldAdvance) {
      commitHour(next, true);
      return;
    }

    setHourDraft(next);
  }

  function handleMinuteDraftChange(raw: string) {
    const next = sanitizeTimeDigits(raw);
    const shouldCommit =
      next.length === 2 || (next.length === 1 && Number(next) > 5);

    if (shouldCommit) {
      commitMinute(next);
      return;
    }

    setMinuteDraft(next);
  }

  function handleTimeKeyDown(
    part: "hour" | "minute",
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Enter") {
      event.preventDefault();

      if (part === "hour") {
        commitHour(hourDraft ?? String(getBaseValue().hour), true);
      } else {
        commitMinute(minuteDraft ?? String(getBaseValue().minute));
      }

      return;
    }

    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }

    event.preventDefault();

    const delta = event.key === "ArrowUp" ? 1 : -1;
    const base = getBaseValue();

    if (part === "hour") {
      const raw = hourDraft ?? String(base.hour);
      const parsed = Number.parseInt(raw, 10);
      const current = Number.isNaN(parsed) ? base.hour : parsed;
      onChange({ ...base, hour: clamp(current + delta, 0, 23) });
      setHourDraft(null);
      return;
    }

    const raw = minuteDraft ?? String(base.minute);
    const parsed = Number.parseInt(raw, 10);
    const current = Number.isNaN(parsed) ? base.minute : parsed;
    onChange({ ...base, minute: clamp(current + delta, 0, 59) });
    setMinuteDraft(null);
  }

  const committedHour = value?.hour ?? 12;
  const committedMinute = value?.minute ?? 0;
  const hourDisplay =
    hourDraft ?? String(committedHour).padStart(2, "0");
  const minuteDisplay =
    minuteDraft ?? String(committedMinute).padStart(2, "0");

  const monthLabel = MONTH_LABELS_RU[viewMonth - 1] ?? "";

  return (
    <div className="w-full">
      <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
        <PopoverPrimitive.Trigger asChild disabled={disabled}>
          <button
            id={id}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-invalid={error || undefined}
            aria-describedby={errorId}
            className={cn(
              "flex h-10 w-full items-center rounded-control border bg-night-800 px-3 text-sm",
              "focus-visible:border-line-strong focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/25",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error ? "border-danger" : "border-line",
            )}
          >
            <span
              className={cn(
                "flex-1 text-left",
                value ? "text-ink-primary" : "text-ink-muted",
              )}
            >
              {value ? formatDateTimeDisplay(value, showTime) : placeholder}
            </span>
            <IconCalendar size={16} className="shrink-0 text-ink-muted" aria-hidden />
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            side="bottom"
            sideOffset={4}
            className="z-50 w-[280px] rounded-card border border-line bg-night-800 p-3 shadow-float"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
            }}
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label="Предыдущий месяц"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-control text-ink-secondary",
                  "hover:bg-night-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/25",
                )}
                onClick={() => {
                  stepMonth(-1);
                }}
              >
                <IconChevronLeft size={16} aria-hidden />
              </button>

              <span className="text-sm text-ink-primary">
                {monthLabel} {String(viewYear)}
              </span>

              <button
                type="button"
                aria-label="Следующий месяц"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-control text-ink-secondary",
                  "hover:bg-night-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/25",
                )}
                onClick={() => {
                  stepMonth(1);
                }}
              >
                <IconChevronRight size={16} aria-hidden />
              </button>
            </div>

            <div className="mt-2 grid grid-cols-7 gap-0.5 text-center">
              {WEEKDAY_LABELS_RU.map((label) => (
                <span
                  key={label}
                  className="py-1 text-[11px] uppercase tracking-wide text-ink-muted"
                >
                  {label}
                </span>
              ))}
            </div>

            <div
              ref={gridRef}
              role="grid"
              aria-label="Выбор дня"
              className="grid grid-cols-7 gap-0.5"
            >
              {Array.from({ length: offset }, (_, index) => (
                <span key={`pad-${String(index)}`} aria-hidden />
              ))}
              {Array.from({ length: totalDays }, (_, index) => {
                const day = index + 1;
                const isSelected =
                  value?.year === viewYear &&
                  value.month === viewMonth &&
                  value.day === day;
                const isFocused = focusedDay === day;

                return (
                  <button
                    key={day}
                    type="button"
                    role="gridcell"
                    data-day={day}
                    tabIndex={isFocused ? 0 : -1}
                    aria-selected={isSelected}
                    className={cn(
                      "h-8 rounded-control text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/25",
                      isSelected
                        ? "bg-amber text-on-amber"
                        : "text-ink-primary hover:bg-night-700",
                    )}
                    onClick={() => {
                      handleSelectDay(day);
                    }}
                    onFocus={() => {
                      setFocusedDay(day);
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {showTime ? (
              <div className="mt-3 flex items-center gap-2 border-t border-line-subtle pt-3">
                <label className="text-xs text-ink-secondary" htmlFor={`${id}-hour`}>
                  Время
                </label>
                <input
                  ref={hourInputRef}
                  id={`${id}-hour`}
                  type="text"
                  inputMode="numeric"
                  value={hourDisplay}
                  onFocus={() => {
                    setHourDraft(String(committedHour));
                  }}
                  onChange={(event) => {
                    handleHourDraftChange(event.target.value);
                  }}
                  onBlur={() => {
                    if (hourDraft !== null) {
                      commitHour(hourDraft);
                    }
                  }}
                  onKeyDown={(event) => {
                    handleTimeKeyDown("hour", event);
                  }}
                  className="h-8 w-12 rounded-control border border-line bg-night-900 px-2 text-center font-mono text-sm text-ink-primary focus:border-line-strong focus:outline-none focus:ring-1 focus:ring-amber/25"
                />
                <span className="text-ink-muted">:</span>
                <input
                  ref={minuteInputRef}
                  id={`${id}-minute`}
                  type="text"
                  inputMode="numeric"
                  value={minuteDisplay}
                  onFocus={() => {
                    setMinuteDraft(String(committedMinute));
                  }}
                  onChange={(event) => {
                    handleMinuteDraftChange(event.target.value);
                  }}
                  onBlur={() => {
                    if (minuteDraft !== null) {
                      commitMinute(minuteDraft);
                    }
                  }}
                  onKeyDown={(event) => {
                    handleTimeKeyDown("minute", event);
                  }}
                  className="h-8 w-12 rounded-control border border-line bg-night-900 px-2 text-center font-mono text-sm text-ink-primary focus:border-line-strong focus:outline-none focus:ring-1 focus:ring-amber/25"
                />
              </div>
            ) : null}

            <div className="mt-2 flex items-center justify-end border-t border-line-subtle pt-2">
              <button
                type="button"
                className="text-sm text-amber hover:text-amber-bright"
                onClick={handleToday}
              >
                Сегодня
              </button>
              {showTime ? (
                <button
                  type="button"
                  className="ml-4 text-sm text-ink-secondary hover:text-ink-primary"
                  onClick={() => {
                    commitPendingTimeDrafts();
                    setOpen(false);
                  }}
                >
                  Готово
                </button>
              ) : null}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      {error && errorMessage ? (
        <p id={errorId} className="mt-1.5 text-xs text-danger" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
