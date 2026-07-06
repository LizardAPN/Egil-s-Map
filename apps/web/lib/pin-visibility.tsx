"use client";

import {
  IconLink,
  IconLock,
  IconUsers,
  IconWorld,
  type Icon,
} from "@tabler/icons-react";

import type { Visibility } from "@imprint/types";
import { cn } from "@imprint/ui";

export const VISIBILITY_OPTIONS: Array<{
  value: Visibility;
  label: string;
  icon: Icon;
  helper: string;
}> = [
  {
    value: "private",
    label: "Личное",
    icon: IconLock,
    helper: "Только вы видите этот пин.",
  },
  {
    value: "friends",
    label: "Друзья",
    icon: IconUsers,
    helper: "Видят взаимные подписчики; координаты приблизительные.",
  },
  {
    value: "unlisted",
    label: "По ссылке",
    icon: IconLink,
    helper: "Доступен по ссылке, не появляется в лентах.",
  },
  {
    value: "public",
    label: "Публично",
    icon: IconWorld,
    helper: "Виден всем; точное место на карте.",
  },
];

export function VisibilityPill({
  visibility,
  className,
}: {
  visibility: Visibility;
  className?: string;
}) {
  const option = VISIBILITY_OPTIONS.find((item) => item.value === visibility);

  if (!option) {
    return null;
  }

  const IconComponent = option.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-ink-secondary",
        className,
      )}
    >
      <IconComponent size={14} stroke={1.5} aria-hidden />
      {option.label}
    </span>
  );
}
