import { describe, expect, it } from "vitest";

import {
  formatTimelineDay,
  formatTimelineMonthHeader,
  monthKeyFromIso,
} from "./format-timeline-date";

describe("formatTimelineMonthHeader", () => {
  it("formats month and year in Russian", () => {
    expect(formatTimelineMonthHeader("2025-06-18T12:00:00Z")).toMatch(
      /июн/i,
    );
    expect(formatTimelineMonthHeader("2025-06-18T12:00:00Z")).toContain(
      "2025",
    );
  });
});

describe("formatTimelineDay", () => {
  it("formats short day and month in Russian", () => {
    const formatted = formatTimelineDay("2025-06-18T12:00:00Z");
    expect(formatted).toMatch(/18/);
    expect(formatted).toMatch(/июн/i);
  });
});

describe("monthKeyFromIso", () => {
  it("returns YYYY-MM key", () => {
    expect(monthKeyFromIso("2025-06-18T12:00:00Z")).toBe("2025-06");
  });
});
