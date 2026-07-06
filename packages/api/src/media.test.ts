import { describe, expect, it } from "vitest";

import {
  buildPinMediaStoragePath,
  scaleToMaxLongestSide,
} from "./media-shared";

describe("buildPinMediaStoragePath", () => {
  it("builds userId/pinId/fileId.webp without bucket prefix", () => {
    expect(
      buildPinMediaStoragePath(
        "user-abc",
        "pin-123",
        "file-456",
      ),
    ).toBe("user-abc/pin-123/file-456.webp");
  });
});

describe("scaleToMaxLongestSide", () => {
  it("scales landscape image down to max longest side", () => {
    expect(scaleToMaxLongestSide(4000, 3000, 2560)).toEqual({
      width: 2560,
      height: 1920,
    });
  });

  it("scales portrait image down to max longest side", () => {
    expect(scaleToMaxLongestSide(3000, 4000, 2560)).toEqual({
      width: 1920,
      height: 2560,
    });
  });

  it("leaves already-small images unchanged", () => {
    expect(scaleToMaxLongestSide(800, 600, 2560)).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("scales blurhash thumbnail so longest side is 32", () => {
    const landscape = scaleToMaxLongestSide(4000, 3000, 32);
    expect(Math.max(landscape.width, landscape.height)).toBe(32);

    const portrait = scaleToMaxLongestSide(3000, 4000, 32);
    expect(Math.max(portrait.width, portrait.height)).toBe(32);

    const square = scaleToMaxLongestSide(100, 100, 32);
    expect(square).toEqual({ width: 32, height: 32 });
  });
});
