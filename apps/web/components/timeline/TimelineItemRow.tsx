"use client";

import { cn } from "@imprint/ui";

import { formatTimelineDay } from "../../lib/format-timeline-date";

export function TimelineItemRow({
  pinnedAt,
  title,
  locationName,
  chapterColor,
  isActive,
  onSelect,
}: {
  pinnedAt: string;
  title: string;
  locationName: string | null;
  chapterColor: string;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex w-full gap-3 rounded-[10px] px-2 py-2 text-left transition-colors duration-150",
        "hover:bg-night-800",
        isActive && "border border-line bg-night-800",
      )}
    >
      <div className="relative flex w-4 shrink-0 justify-center pt-1">
        <span
          className="absolute top-0 bottom-0 w-0.5 bg-night-600"
          aria-hidden
        />
        <span
          className={cn(
            "relative z-[1] rounded-full ring-2 ring-night-900 transition-all duration-150",
            isActive ? "size-2.5" : "size-2",
          )}
          style={{ backgroundColor: chapterColor }}
          aria-hidden
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-ink-secondary">
          {formatTimelineDay(pinnedAt)}
        </p>
        <p className="truncate text-[13px] text-ink-body">{title}</p>
        {locationName ? (
          <p className="truncate text-[11px] text-ink-muted">{locationName}</p>
        ) : null}
      </div>
    </button>
  );
}
