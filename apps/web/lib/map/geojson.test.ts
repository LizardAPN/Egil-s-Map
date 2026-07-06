import type { PinListItem } from "@imprint/types";
import { describe, expect, it } from "vitest";

import { DEFAULT_CHAPTER_COLOR } from "../chapter-colors";

import { pinsToFeatureCollection } from "./geojson";

function makePin(overrides: Partial<PinListItem> = {}): PinListItem {
  return {
    id: "pin-1",
    userId: "user-1",
    chapterId: "chapter-1",
    location: { lng: 1, lat: 2 },
    locationExact: true,
    locationName: null,
    title: "Test",
    visibility: "private",
    pinnedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("pinsToFeatureCollection", () => {
  it("resolves chapter color from the map", () => {
    const colors = new Map([["chapter-1", "#5DCAA5"]]);
    const fc = pinsToFeatureCollection([makePin()], null, colors);

    expect(fc.features[0]?.properties.color).toBe("#5DCAA5");
  });

  it("falls back to amber when chapter is missing or unknown", () => {
    const colors = new Map<string, string>();

    const noChapter = pinsToFeatureCollection(
      [makePin({ chapterId: null })],
      null,
      colors,
    );
    const unknownChapter = pinsToFeatureCollection(
      [makePin({ chapterId: "unknown" })],
      null,
      colors,
    );

    expect(noChapter.features[0]?.properties.color).toBe(DEFAULT_CHAPTER_COLOR);
    expect(unknownChapter.features[0]?.properties.color).toBe(
      DEFAULT_CHAPTER_COLOR,
    );
  });

  it("maps exact flag to 0 or 1", () => {
    const colors = new Map<string, string>();

    const exact = pinsToFeatureCollection(
      [makePin({ locationExact: true })],
      null,
      colors,
    );
    const blurred = pinsToFeatureCollection(
      [makePin({ locationExact: false })],
      null,
      colors,
    );

    expect(exact.features[0]?.properties.exact).toBe(1);
    expect(blurred.features[0]?.properties.exact).toBe(0);
  });

  it("marks the active pin in properties", () => {
    const colors = new Map<string, string>();
    const fc = pinsToFeatureCollection([makePin({ id: "active-pin" })], "active-pin", colors);

    expect(fc.features[0]?.properties.active).toBe(1);
  });
});
