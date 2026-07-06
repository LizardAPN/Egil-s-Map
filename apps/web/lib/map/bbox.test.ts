import { describe, expect, it } from "vitest";

import {
  clampBbox,
  expandBbox,
  queryBboxForPins,
  roundBbox,
  WORLD_BBOX,
} from "./bbox";

describe("bbox helpers", () => {
  it("clamps expanded coordinates to valid world bounds", () => {
    const globeViewport: [number, number, number, number] = [
      -160, -70, 160, 70,
    ];

    const expanded = expandBbox(globeViewport);

    expect(expanded[0]).toBeGreaterThanOrEqual(-180);
    expect(expanded[1]).toBeGreaterThanOrEqual(-90);
    expect(expanded[2]).toBeLessThanOrEqual(180);
    expect(expanded[3]).toBeLessThanOrEqual(90);
  });

  it("uses world bbox at low zoom", () => {
    const europe: [number, number, number, number] = [-20, 35, 30, 60];

    expect(queryBboxForPins(europe, 3)).toEqual(WORLD_BBOX);
  });

  it("uses expanded viewport bbox at regional zoom", () => {
    const lisbon: [number, number, number, number] = [-10, 38, -8, 40];

    expect(queryBboxForPins(lisbon, 10)).toEqual(expandBbox(roundBbox(lisbon)));
  });

  it("falls back to world bbox when span is near-global", () => {
    const nearWorld: [number, number, number, number] = [-150, -60, 150, 60];

    expect(queryBboxForPins(nearWorld, 5)).toEqual(WORLD_BBOX);
  });

  it("clampBbox limits invalid envelopes", () => {
    expect(clampBbox([-220, -100, 220, 100])).toEqual(WORLD_BBOX);
  });
});
