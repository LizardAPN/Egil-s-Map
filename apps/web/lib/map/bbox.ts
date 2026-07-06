import type { Bbox } from "@imprint/types";

export const WORLD_BBOX: Bbox = [-180, -90, 180, 90];

const LOW_ZOOM_WORLD_THRESHOLD = 4;

function roundCoord(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function roundBbox(bbox: Bbox, decimals = 3): Bbox {
  return [
    roundCoord(bbox[0], decimals),
    roundCoord(bbox[1], decimals),
    roundCoord(bbox[2], decimals),
    roundCoord(bbox[3], decimals),
  ];
}

export function clampBbox(bbox: Bbox): Bbox {
  return [
    Math.max(-180, bbox[0]),
    Math.max(-90, bbox[1]),
    Math.min(180, bbox[2]),
    Math.min(90, bbox[3]),
  ];
}

export function expandBbox(bbox: Bbox, padding = 0.25): Bbox {
  const [west, south, east, north] = bbox;
  const width = east - west;
  const height = north - south;

  return clampBbox([
    west - width * padding,
    south - height * padding,
    east + width * padding,
    north + height * padding,
  ]);
}

export function queryBboxForPins(viewportBbox: Bbox, zoom: number): Bbox {
  if (zoom < LOW_ZOOM_WORLD_THRESHOLD) {
    return WORLD_BBOX;
  }

  const expanded = expandBbox(roundBbox(viewportBbox));
  const [west, south, east, north] = expanded;
  const width = east - west;
  const height = north - south;

  if (width >= 270 || height >= 135) {
    return WORLD_BBOX;
  }

  return expanded;
}
