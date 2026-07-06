"use client";

import { IconChevronLeft } from "@tabler/icons-react";

import { cn } from "@imprint/ui";

import { useChapterScopeSync } from "../../hooks/use-chapter-scope-sync";
import { useCreatePinMode } from "../../hooks/use-create-pin-mode";
import { useTimelineCollapsed } from "../../hooks/use-timeline-collapsed";
import { useMapStore } from "../../stores/map-store";
import { TimelineList } from "./TimelineList";
import { TimelineScopeSwitcher } from "./TimelineScopeSwitcher";

export function TimelinePanel() {
  useChapterScopeSync();

  const { collapsed, toggleCollapsed, hydrated } = useTimelineCollapsed();
  const scopeChapterId = useMapStore((state) => state.scope.chapterId);
  const { enterCreateMode } = useCreatePinMode();

  return (
    <div className="pointer-events-none fixed left-0 top-[52px] bottom-0 z-20 flex items-stretch">
      <div
        className={cn(
          "pointer-events-auto h-full transition-transform duration-[250ms] ease-out",
          hydrated && collapsed && "-translate-x-[320px]",
        )}
      >
        <div className="flex h-full w-[320px] flex-col border-r border-line-subtle bg-night-900/90 p-4 backdrop-blur">
          <TimelineScopeSwitcher />

          <div className="mt-4 flex min-h-0 flex-1 flex-col">
            <TimelineList
              isScoped={Boolean(scopeChapterId)}
              onAddPin={enterCreateMode}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-label={collapsed ? "Развернуть таймлайн" : "Свернуть таймлайн"}
        aria-expanded={!collapsed}
        onClick={toggleCollapsed}
        className={cn(
          "pointer-events-auto -ml-3 self-center flex size-6 items-center justify-center rounded-full",
          "border border-line-subtle bg-night-800 text-ink-secondary shadow-float",
          "hover:bg-night-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber/25",
        )}
      >
        <IconChevronLeft
          size={14}
          className={cn(
            "transition-transform duration-[250ms]",
            collapsed && "rotate-180",
          )}
          aria-hidden
        />
      </button>
    </div>
  );
}
