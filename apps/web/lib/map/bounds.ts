import type { LngLatBoundsLike } from "mapbox-gl";

import type { PinListItem } from "@imprint/types";

export function pinsToBounds(pins: PinListItem[]): LngLatBoundsLike | null {
  if (pins.length === 0) {
    return null;
  }

  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  for (const pin of pins) {
    const { lng, lat } = pin.location;
    west = Math.min(west, lng);
    south = Math.min(south, lat);
    east = Math.max(east, lng);
    north = Math.max(north, lat);
  }

  return [
    [west, south],
    [east, north],
  ];
}
