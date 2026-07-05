import { describe, expect, it } from "vitest";

import {
  bboxToRpcArgs,
  locationToWkt,
  mapPinDetailRow,
  mapPinRow,
  type PinDetailRow,
  type PinListRow,
} from "./mappers";

const baseRow: PinListRow = {
  id: "00000000-0000-0000-0000-000000000101",
  user_id: "00000000-0000-0000-0000-000000000001",
  chapter_id: "00000000-0000-0000-0000-000000000010",
  lng: -9.13,
  lat: 38.712,
  location_exact: true,
  location_name: "Алфама",
  title: "Первое утро в Алфаме",
  visibility: "friends",
  pinned_at: "2025-03-05T09:30:00Z",
};

describe("mapPinRow", () => {
  it("maps snake_case row to PinListItem", () => {
    expect(mapPinRow(baseRow)).toEqual({
      id: baseRow.id,
      userId: baseRow.user_id,
      chapterId: baseRow.chapter_id,
      location: { lng: -9.13, lat: 38.712 },
      locationExact: true,
      locationName: "Алфама",
      title: "Первое утро в Алфаме",
      visibility: "friends",
      pinnedAt: "2025-03-05T09:30:00Z",
    });
  });

  it("handles locationExact false (blurred friends pin)", () => {
    const blurred: PinListRow = { ...baseRow, location_exact: false };
    expect(mapPinRow(blurred).locationExact).toBe(false);
  });

  it("handles null chapterId", () => {
    const unlinked: PinListRow = { ...baseRow, chapter_id: null as unknown as string };
    expect(mapPinRow(unlinked).chapterId).toBeNull();
  });
});

describe("mapPinDetailRow", () => {
  it("includes body", () => {
    const detail: PinDetailRow = {
      ...baseRow,
      body: "Story text here.",
    };
    expect(mapPinDetailRow(detail).body).toBe("Story text here.");
  });
});

describe("locationToWkt", () => {
  it("builds POINT with lng first", () => {
    expect(locationToWkt({ lng: -9.13, lat: 38.712 })).toBe("POINT(-9.13 38.712)");
  });
});

describe("bboxToRpcArgs", () => {
  it("serializes Bbox to RPC argument names", () => {
    expect(bboxToRpcArgs([-10, 36, -5, 42])).toEqual({
      min_lng: -10,
      min_lat: 36,
      max_lng: -5,
      max_lat: 42,
    });
  });
});
