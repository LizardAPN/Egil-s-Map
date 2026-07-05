"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { cn } from "../lib/cn";

export interface MonthValue {
  year: number;
  month: number;
}

export interface MonthPickerProps {
  value?: MonthValue | null;
  onChange: (value: MonthValue | null) => void;
  min?: MonthValue;
  max?: MonthValue;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
}

export const MONTH_LABELS_RU = [
  "янв",
  "фев",
  "мар",
  "апр",
  "май",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
] as const;

export function compareMonths(a: MonthValue, b: MonthValue): number {
  if (a.year !== b.year) {
    return a.year - b.year;
  }
  return a.month - b.month;
}

export function formatMonthDisplay(value: MonthValue): string {
  const label = MONTH_LABELS_RU[value.month - 1] ?? "";
  return `${label} ${String(value.year)}`;
}

export function monthValueToIsoDate(value: MonthValue): string {
  const month = String(value.month).padStart(2, "0");
  return `${String(value.year)}-${month}-01`;
}

export function isMonthDisabled(
  value: MonthValue,
  min?: MonthValue,
  max?: MonthValue,
): boolean {
  if (min && compareMonths(value, min) < 0) {
    return true;
  }
  if (max && compareMonths(value, max) > 0) {
    return true;
  }
  return false;
}

function getCurrentMonth(): MonthValue {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function isYearFullyDisabled(year: number, min?: MonthValue, max?: MonthValue): boolean {
  const firstMonth: MonthValue = { year, month: 1 };
  const lastMonth: MonthValue = { year, month: 12 };
  return isMonthDisabled(firstMonth, min, max) && isMonthDisabled(lastMonth, min, max);
}

function canStepYear(
  viewYear: number,
  direction: -1 | 1,
  min?: MonthValue,
  max?: MonthValue,
): boolean {
  const nextYear = viewYear + direction;
  return !isYearFullyDisabled(nextYear, min, max);
}

function findInitialFocusIndex(
  viewYear: number,
  value: MonthValue | null | undefined,
  min?: MonthValue,
  max?: MonthValue,
): number {
  if (value && value.year === viewYear) {
    const candidate = value.month - 1;
    const monthValue: MonthValue = { year: viewYear, month: value.month };
    if (!isMonthDisabled(monthValue, min, max)) {
      return candidate;
    }
  }

  for (let month = 1; month <= 12; month += 1) {
    const monthValue: MonthValue = { year: viewYear, month };
    if (!isMonthDisabled(monthValue, min, max)) {
      return month - 1;
    }
  }

  return 0;
}

export function MonthPicker({
  value,
  onChange,
  min,
  max,
  placeholder = "Месяц",
  id: idProp,
  disabled = false,
  error = false,
  errorMessage,
}: MonthPickerProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const errorId = error && errorMessage ? `${id}-error` : undefined;
  const gridRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => value?.year ?? getCurrentMonth().year);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const focusMonthButton = useCallback((index: number) => {
    const button = gridRef.current?.querySelector<HTMLButtonElement>(
      `[data-month-index="${String(index)}"]`,
    );
    button?.focus();
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const initialYear = value?.year ?? getCurrentMonth().year;
    const initialIndex = findInitialFocusIndex(initialYear, value, min, max);
    setViewYear(initialYear);
    setFocusedIndex(initialIndex);

    requestAnimationFrame(() => {
      focusMonthButton(initialIndex);
    });
  }, [open, value, min, max, focusMonthButton]);

  function handleSelectMonth(month: number) {
    const selected: MonthValue = { year: viewYear, month };
    if (isMonthDisabled(selected, min, max)) {
      return;
    }
    onChange(selected);
    setOpen(false);
  }

  function handleClear() {
    onChange(null);
    setOpen(false);
  }

  function handleCurrent() {
    const current = getCurrentMonth();
    if (!isMonthDisabled(current, min, max)) {
      onChange(current);
      setOpen(false);
    }
  }

  function moveFocus(delta: number) {
    const direction = delta > 0 ? 1 : -1;
    const steps = Math.abs(delta);
    let nextIndex = focusedIndex;

    for (let step = 0; step < steps; step += 1) {
      let candidate = nextIndex + direction;
      let found = false;

      while (candidate >= 0 && candidate <= 11) {
        const monthValue: MonthValue = { year: viewYear, month: candidate + 1 };
        if (!isMonthDisabled(monthValue, min, max)) {
          nextIndex = candidate;
          found = true;
          break;
        }
        candidate += direction;
      }

      if (!found) {
        break;
      }
    }

    if (nextIndex !== focusedIndex) {
      setFocusedIndex(nextIndex);
      focusMonthButton(nextIndex);
    }
  }

  function handleGridKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        moveFocus(-1);
        break;
      case "ArrowRight":
        event.preventDefault();
        moveFocus(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveFocus(-4);
        break;
      case "ArrowDown":
        event.preventDefault();
        moveFocus(4);
        break;
      case "Enter":
      case " ": {
        event.preventDefault();
        const monthValue: MonthValue = { year: viewYear, month: focusedIndex + 1 };
        if (!isMonthDisabled(monthValue, min, max)) {
          handleSelectMonth(focusedIndex + 1);
        }
        break;
      }
      default:
        break;
    }
  }

  const currentMonth = getCurrentMonth();
  const currentDisabled = isMonthDisabled(currentMonth, min, max);

  return (
    <div className="w-full">
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
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
              {value ? formatMonthDisplay(value) : placeholder}
            </span>
            <IconCalendar size={16} className="shrink-0 text-ink-muted" aria-hidden />
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            side="bottom"
            sideOffset={4}
            className="z-50 w-[240px] rounded-card border border-line bg-night-800 p-3 shadow-float"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
            }}
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label="Предыдущий год"
                disabled={!canStepYear(viewYear, -1, min, max)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-control text-ink-secondary",
                  "hover:bg-night-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/25",
                  "disabled:pointer-events-none disabled:opacity-50",
                )}
                onClick={() => {
                  if (canStepYear(viewYear, -1, min, max)) {
                    const nextYear = viewYear - 1;
                    const nextIndex = findInitialFocusIndex(nextYear, value, min, max);
                    setViewYear(nextYear);
                    setFocusedIndex(nextIndex);
                    requestAnimationFrame(() => {
                      focusMonthButton(nextIndex);
                    });
                  }
                }}
              >
                <IconChevronLeft size={16} aria-hidden />
              </button>

              <span className="font-mono text-sm text-ink-primary">{viewYear}</span>

              <button
                type="button"
                aria-label="Следующий год"
                disabled={!canStepYear(viewYear, 1, min, max)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-control text-ink-secondary",
                  "hover:bg-night-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/25",
                  "disabled:pointer-events-none disabled:opacity-50",
                )}
                onClick={() => {
                  if (canStepYear(viewYear, 1, min, max)) {
                    const nextYear = viewYear + 1;
                    const nextIndex = findInitialFocusIndex(nextYear, value, min, max);
                    setViewYear(nextYear);
                    setFocusedIndex(nextIndex);
                    requestAnimationFrame(() => {
                      focusMonthButton(nextIndex);
                    });
                  }
                }}
              >
                <IconChevronRight size={16} aria-hidden />
              </button>
            </div>

            <div
              ref={gridRef}
              role="grid"
              aria-label="Выбор месяца"
              className="mt-2 grid grid-cols-4 gap-1"
              onKeyDown={handleGridKeyDown}
            >
              {MONTH_LABELS_RU.map((label, index) => {
                const month = index + 1;
                const monthValue: MonthValue = { year: viewYear, month };
                const isSelected =
                  value?.year === viewYear && value.month === month;
                const isDisabled = isMonthDisabled(monthValue, min, max);
                const isFocused = focusedIndex === index;

                return (
                  <button
                    key={label}
                    type="button"
                    role="gridcell"
                    data-month-index={index}
                    tabIndex={isFocused ? 0 : -1}
                    aria-selected={isSelected}
                    aria-disabled={isDisabled}
                    disabled={isDisabled}
                    className={cn(
                      "h-8 rounded-control text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/25",
                      isSelected
                        ? "bg-amber text-on-amber"
                        : "text-ink-primary hover:bg-night-700",
                      isDisabled && "pointer-events-none text-ink-muted opacity-50",
                    )}
                    onClick={() => {
                      handleSelectMonth(month);
                    }}
                    onFocus={() => {
                      setFocusedIndex(index);
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-line-subtle pt-2">
              <button
                type="button"
                className="text-sm text-ink-secondary hover:text-danger"
                onClick={handleClear}
              >
                Очистить
              </button>
              <button
                type="button"
                disabled={currentDisabled}
                className={cn(
                  "text-sm text-amber hover:text-amber-bright",
                  "disabled:pointer-events-none disabled:opacity-50",
                )}
                onClick={handleCurrent}
              >
                Текущий
              </button>
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
