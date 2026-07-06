import { describe, expect, it } from "vitest";

import { formatChapterPeriod } from "./format-chapter-period";

describe("formatChapterPeriod", () => {
  it("formats a date range", () => {
    expect(
      formatChapterPeriod("2025-03-01", "2025-11-30"),
    ).toMatch(/мар.*2025.*—.*ноя.*2025/i);
  });

  it("returns null when no dates", () => {
    expect(formatChapterPeriod(null, null)).toBeNull();
  });

  it("formats start-only period", () => {
    expect(formatChapterPeriod("2025-03-01", null)).toMatch(/^с /);
  });
});
