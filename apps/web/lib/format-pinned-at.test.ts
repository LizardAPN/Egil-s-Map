import { describe, expect, it } from "vitest";

import { formatPinnedAt } from "./format-pinned-at";

describe("formatPinnedAt", () => {
  it("formats ISO date in Russian locale", () => {
    const formatted = formatPinnedAt("2025-06-18T12:00:00Z");
    expect(formatted).toContain("2025");
    expect(formatted).toContain("июн");
    expect(formatted).toContain("18");
  });
});
