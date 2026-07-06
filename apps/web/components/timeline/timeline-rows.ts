import type { PinListItem } from "@imprint/types";

import {
  formatTimelineMonthHeader,
  monthKeyFromIso,
} from "../../lib/format-timeline-date";

export type TimelineRow =
  | { kind: "month"; key: string; label: string }
  | { kind: "pin"; pin: PinListItem };

export function buildTimelineRows(pins: PinListItem[]): TimelineRow[] {
  const rows: TimelineRow[] = [];
  let lastMonthKey: string | null = null;

  for (const pin of pins) {
    const monthKey = monthKeyFromIso(pin.pinnedAt);

    if (monthKey !== lastMonthKey) {
      rows.push({
        kind: "month",
        key: monthKey,
        label: formatTimelineMonthHeader(pin.pinnedAt).toUpperCase(),
      });
      lastMonthKey = monthKey;
    }

    rows.push({ kind: "pin", pin });
  }

  return rows;
}
