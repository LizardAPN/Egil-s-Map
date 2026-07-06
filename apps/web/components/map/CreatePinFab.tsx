"use client";

import { IconPlus } from "@tabler/icons-react";

import { cn } from "@imprint/ui";

export function CreatePinFab({
  isCreateMode,
  onToggle,
}: {
  isCreateMode: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      title="Добавить воспоминание"
      aria-label="Добавить воспоминание"
      aria-pressed={isCreateMode}
      onClick={onToggle}
      className={cn(
        "pointer-events-auto fixed bottom-10 right-3 z-10 flex size-12 items-center justify-center rounded-full bg-amber text-on-amber shadow-float transition-colors",
        "hover:bg-amber-bright active:bg-amber-deep",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/40",
        isCreateMode && "ring-2 ring-amber-bright/60",
      )}
    >
      <IconPlus size={22} stroke={2} aria-hidden />
    </button>
  );
}
