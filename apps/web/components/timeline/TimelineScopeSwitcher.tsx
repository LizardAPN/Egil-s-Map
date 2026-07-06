"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import { IconChevronDown } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import type { Chapter } from "@imprint/types";
import { cn } from "@imprint/ui";

import { useAllMyPins } from "../../hooks/use-my-pins";
import { useMyChapters } from "../../hooks/use-my-chapters";
import { useSetChapterScope } from "../../hooks/use-chapter-scope-sync";
import { formatChapterPeriod } from "../../lib/format-chapter-period";
import { useMapStore } from "../../stores/map-store";

function ChapterDot({ color }: { color: string }) {
  return (
    <span
      className="size-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

function pinCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${String(count)} воспоминание`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${String(count)} воспоминания`;
  }

  return `${String(count)} воспоминаний`;
}

export function TimelineScopeSwitcher() {
  const [open, setOpen] = useState(false);
  const scopeChapterId = useMapStore((state) => state.scope.chapterId);
  const setChapterScope = useSetChapterScope();
  const { data: chapters = [] } = useMyChapters();
  const { data: allPins = [] } = useAllMyPins();

  const pinCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const pin of allPins) {
      if (!pin.chapterId) {
        continue;
      }

      counts.set(pin.chapterId, (counts.get(pin.chapterId) ?? 0) + 1);
    }

    return counts;
  }, [allPins]);

  const activeChapter: Chapter | null =
    chapters.find((chapter) => chapter.id === scopeChapterId) ?? null;

  const scopeLabel = activeChapter?.title ?? "Все воспоминания";
  const scopedPinCount = activeChapter
    ? (pinCounts.get(activeChapter.id) ?? 0)
    : allPins.length;

  return (
    <div className="shrink-0 space-y-3">
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            className={cn(
              "flex w-full items-center gap-2 rounded-control border border-line bg-night-800 px-3 py-2 text-left text-sm text-ink-body",
              "hover:bg-night-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/25",
            )}
          >
            <span className="min-w-0 flex-1 truncate">{scopeLabel}</span>
            <IconChevronDown
              size={16}
              className={cn(
                "shrink-0 text-ink-muted transition-transform duration-150",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            side="bottom"
            sideOffset={4}
            className="z-50 w-[288px] rounded-card border border-line bg-night-800 p-1 shadow-float"
          >
            <button
              type="button"
              role="option"
              aria-selected={!scopeChapterId}
              onClick={() => {
                setChapterScope(null);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-control px-3 py-2 text-left text-sm text-ink-body",
                "hover:bg-night-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/25",
                !scopeChapterId && "bg-night-700",
              )}
            >
              <span>Все воспоминания</span>
              <span className="text-xs text-ink-muted">{allPins.length}</span>
            </button>

            {chapters.map((chapter) => {
              const count = pinCounts.get(chapter.id) ?? 0;

              return (
                <button
                  key={chapter.id}
                  type="button"
                  role="option"
                  aria-selected={scopeChapterId === chapter.id}
                  onClick={() => {
                    setChapterScope(chapter.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm text-ink-body",
                    "hover:bg-night-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/25",
                    scopeChapterId === chapter.id && "bg-night-700",
                  )}
                >
                  <ChapterDot color={chapter.color} />
                  <span className="min-w-0 flex-1 truncate">{chapter.title}</span>
                  <span className="shrink-0 text-xs text-ink-muted">{count}</span>
                </button>
              );
            })}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      {activeChapter ? (
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            Глава
          </p>
          <h2 className="font-display text-[15px] text-ink-cream">
            {activeChapter.title}
          </h2>
          {formatChapterPeriod(activeChapter.startedAt, activeChapter.endedAt) ? (
            <p
              className="font-mono text-[11px]"
              style={{ color: activeChapter.color }}
            >
              {formatChapterPeriod(activeChapter.startedAt, activeChapter.endedAt)}
            </p>
          ) : null}
          <p className="text-[11px] text-ink-muted">
            {pinCountLabel(scopedPinCount)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
