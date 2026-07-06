import { describe, expect, it } from "vitest";

import type { PinListItem } from "@imprint/types";

import { buildTimelineRows } from "./timeline-rows";

function makePin(id: string, pinnedAt: string): PinListItem {
  return {
    id,
    userId: "user-1",
    chapterId: "chapter-1",
    location: { lng: 0, lat: 0 },
    locationExact: true,
    locationName: null,
    title: `Pin ${id}`,
    visibility: "private",
    pinnedAt,
  };
}

describe("buildTimelineRows", () => {
  it("groups pins by month in DESC order with month headers", () => {
    const pins = [
      makePin("b", "2025-07-10T12:00:00Z"),
      makePin("a", "2025-06-18T12:00:00Z"),
      makePin("c", "2025-06-05T12:00:00Z"),
    ];

    const rows = buildTimelineRows(pins);

    expect(rows).toHaveLength(5);
    expect(rows[0]?.kind).toBe("month");
    if (rows[0]?.kind === "month") {
      expect(rows[0].key).toBe("2025-07");
    }

    expect(rows[1]?.kind).toBe("pin");
    if (rows[1]?.kind === "pin") {
      expect(rows[1].pin.id).toBe("b");
    }

    expect(rows[2]?.kind).toBe("month");
    if (rows[2]?.kind === "month") {
      expect(rows[2].key).toBe("2025-06");
    }

    expect(rows[3]?.kind).toBe("pin");
    if (rows[3]?.kind === "pin") {
      expect(rows[3].pin.id).toBe("a");
    }

    expect(rows[4]?.kind).toBe("pin");
    if (rows[4]?.kind === "pin") {
      expect(rows[4].pin.id).toBe("c");
    }
  });
});
