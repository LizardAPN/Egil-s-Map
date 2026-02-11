"use client";

import { useState, useRef, useEffect } from "react";

const PLACEHOLDER = "__.__.____";
const FORMAT_LENGTH = 10; // dd.mm.yyyy

function formatDisplay(d: Date | null): string {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function parseInput(s: string): Date | null {
  const digits = s.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const dd = parseInt(digits.slice(0, 2), 10);
  const mm = parseInt(digits.slice(2, 4), 10) - 1;
  const yyyy = parseInt(digits.slice(4, 8), 10);
  const d = new Date(yyyy, mm, dd);
  if (isNaN(d.getTime()) || d.getDate() !== dd || d.getMonth() !== mm || d.getFullYear() !== yyyy) {
    return null;
  }
  return d;
}

/** Format raw digits into dd.mm.yyyy, filling left to right */
function formatTyped(digits: string): string {
  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits + (digits.length === 2 ? "." : "");
  if (digits.length <= 4) return digits.slice(0, 2) + "." + digits.slice(2) + (digits.length === 4 ? "." : "");
  return digits.slice(0, 2) + "." + digits.slice(2, 4) + "." + digits.slice(4, 8);
}

export type DateInputProps = {
  value: Date | null;
  onChange: (d: Date | null) => void;
  min?: Date;
  max?: Date;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  locale?: string; // e.g. "en" or "ru" for calendar month/year label
};

export default function DateInput({
  value,
  onChange,
  min,
  max,
  placeholder = PLACEHOLDER,
  disabled,
  className = "",
  id,
  locale = "en",
}: DateInputProps) {
  const [focused, setFocused] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayValue = focused ? manualInput : (value ? formatDisplay(value) : "");
  const showPlaceholder = !displayValue;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Backspace") {
      if (focused && manualInput) {
        const digits = manualInput.replace(/\D/g, "").slice(0, -1);
        const formatted = formatTyped(digits);
        setManualInput(formatted);
        if (digits.length === 8) {
          const d = parseInput(digits);
          onChange(d);
        } else {
          onChange(null);
        }
        e.preventDefault();
      }
    }
  }

  function handleInput(e: React.FormEvent<HTMLInputElement>) {
    const raw = (e.target as HTMLInputElement).value;
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    const formatted = formatTyped(digits);
    setManualInput(formatted);
    if (digits.length === 8) {
      const d = parseInput(digits);
      if (d) {
        if (max && d > max) return;
        if (min && d < min) return;
        onChange(d);
      } else {
        onChange(null);
      }
    } else {
      onChange(null);
    }
  }

  function handleFocus() {
    setFocused(true);
    setShowPicker(true);
    setManualInput(value ? formatDisplay(value) : "");
  }

  function handleBlur() {
    if (manualInput && manualInput.replace(/\D/g, "").length === 8) {
      const d = parseInput(manualInput);
      if (d) onChange(d);
    }
    setFocused(false);
  }

  function handleSelectDate(d: Date) {
    if (max && d > max) return;
    if (min && d < min) return;
    onChange(d);
    setManualInput(formatDisplay(d));
    setShowPicker(false);
  }

  const today = new Date();
  const [viewYear, setViewYear] = useState(() => (value ? value.getFullYear() : today.getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (value ? value.getMonth() : today.getMonth()));

  // When value changes, update view
  useEffect(() => {
    if (value) {
      setViewYear(value.getFullYear());
      setViewMonth(value.getMonth());
    }
  }, [value?.getTime()]);

  const displayMonth = viewMonth;
  const displayYear = viewYear;

  // First day of month, day of week (0=Sun)
  const firstDay = new Date(displayYear, displayMonth, 1).getDay();
  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const maxDate = max || today;
  const minDate = min;

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={displayValue}
        placeholder={placeholder}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        className={`${className} ${showPlaceholder ? "text-gray-500" : ""}`}
        maxLength={FORMAT_LENGTH + 2}
      />
      {showPicker && !disabled && (
        <div className="absolute z-50 mt-1 left-0 w-64 bg-[#1a1a1e] border-2 border-[#3a3a3e] rounded-lg shadow-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => {
                if (viewMonth === 0) {
                  setViewMonth(11);
                  setViewYear((y) => y - 1);
                } else setViewMonth((m) => m - 1);
              }}
              className="p-1 text-amber-400 hover:bg-amber-400/20 rounded"
            >
              ‹
            </button>
            <span className="font-cinzel text-amber-400">
              {new Date(displayYear, displayMonth).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", { month: "long", year: "numeric" })}
            </span>
            <button
              type="button"
              onClick={() => {
                if (viewMonth === 11) {
                  setViewMonth(0);
                  setViewYear((y) => y + 1);
                } else setViewMonth((m) => m + 1);
              }}
              className="p-1 text-amber-400 hover:bg-amber-400/20 rounded"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="text-gray-500 py-1 font-special-elite">
                {new Date(2024, 0, 7 + i).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", { weekday: "narrow" })}
              </div>
            ))}
            {days.map((d, i) => {
              if (d === null) return <div key={`e-${i}`} />;
              const date = new Date(displayYear, displayMonth, d);
              const isFuture = date > maxDate;
              const isBeforeMin = minDate && date < minDate;
              const isSelected = value && value.getDate() === d && value.getMonth() === displayMonth && value.getFullYear() === displayYear;
              const isToday = date.toDateString() === today.toDateString();
              return (
                <button
                  key={d}
                  type="button"
                  disabled={isFuture || !!isBeforeMin}
                  onClick={() => handleSelectDate(date)}
                  className={`py-1.5 rounded font-special-elite transition-colors
                    ${isFuture || isBeforeMin ? "text-gray-600 cursor-not-allowed" : "hover:bg-amber-400/30 text-gray-200"}
                    ${isSelected ? "bg-amber-500/50 text-amber-400" : ""}
                    ${isToday && !isSelected ? "ring-1 ring-amber-400/50" : ""}
                  `}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
