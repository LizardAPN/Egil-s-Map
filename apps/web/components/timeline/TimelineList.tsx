"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { IconMapPin } from "@tabler/icons-react";
import { useRef } from "react";

import { Button, EmptyState } from "@imprint/ui";

import { useChapterColors } from "../../hooks/use-chapter-colors";
import { useMyPins } from "../../hooks/use-my-pins";
import { useMapStore } from "../../stores/map-store";
import { useTimelinePinSelect } from "../../hooks/use-timeline-pin-select";
import { TimelineItemRow } from "./TimelineItemRow";
import { TimelineSkeleton } from "./TimelineSkeleton";
import { buildTimelineRows, type TimelineRow } from "./timeline-rows";

const MONTH_ROW_HEIGHT = 32;
const PIN_ROW_HEIGHT = 72;

function rowHeight(row: TimelineRow): number {
  return row.kind === "month" ? MONTH_ROW_HEIGHT : PIN_ROW_HEIGHT;
}

export function TimelineList({
  isScoped,
  onAddPin,
}: {
  isScoped: boolean;
  onAddPin: () => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { data: pins, isLoading } = useMyPins();
  const activePinId = useMapStore((state) => state.activePinId);
  const chapterColors = useChapterColors();
  const { requestSelectPin, confirmDialog } = useTimelinePinSelect();

  const rows = pins ? buildTimelineRows(pins) : [];

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = rows[index];
      return row ? rowHeight(row) : PIN_ROW_HEIGHT;
    },
    overscan: 8,
  });

  if (isLoading) {
    return <TimelineSkeleton />;
  }

  if (!pins || pins.length === 0) {
    if (isScoped) {
      return (
        <EmptyState
          icon={IconMapPin}
          title="В этой главе пока пусто"
          description="Добавь воспоминания в эту главу — они появятся здесь."
          className="py-8"
        />
      );
    }

    return (
      <EmptyState
        icon={IconMapPin}
        title="Здесь появится твоя история"
        description="Отмечай места на карте — каждый пин станет частью твоего пути."
        action={
          <Button type="button" onClick={onAddPin}>
            Добавить воспоминание
          </Button>
        }
        className="py-8"
      />
    );
  }

  return (
    <>
      <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div
          className="relative w-full"
          style={{ height: `${String(virtualizer.getTotalSize())}px` }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const row = rows[virtualItem.index];

            if (!row) {
              return null;
            }

            return (
              <div
                key={row.kind === "month" ? `month-${row.key}` : row.pin.id}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                className="absolute left-0 top-0 w-full"
                style={{
                  transform: `translateY(${String(virtualItem.start)}px)`,
                }}
              >
                {row.kind === "month" ? (
                  <div className="sticky top-0 z-[1] bg-night-900/90 py-2 backdrop-blur">
                    <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                      {row.label}
                    </p>
                  </div>
                ) : (
                  <TimelineItemRow
                    pinnedAt={row.pin.pinnedAt}
                    title={row.pin.title}
                    locationName={row.pin.locationName}
                    chapterColor={
                      row.pin.chapterId
                        ? (chapterColors.get(row.pin.chapterId) ?? "#EFB65A")
                        : "#EFB65A"
                    }
                    isActive={activePinId === row.pin.id}
                    onSelect={() => {
                      requestSelectPin(row.pin.id);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      {confirmDialog}
    </>
  );
}
