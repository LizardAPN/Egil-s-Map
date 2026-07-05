import type { Coordinates } from "@imprint/types";

/** Fuzzy offset ±500m for friends visibility (privacy). */
export function applyFuzzyOffset(coordinates: Coordinates): Coordinates {
  const maxOffsetMeters = 500;
  const bearing = Math.random() * Math.PI * 2;
  const radius = Math.random() * maxOffsetMeters;
  const latitudeOffset = (radius * Math.cos(bearing)) / 111_320;
  const longitudeOffset =
    (radius * Math.sin(bearing)) /
    (111_320 * Math.max(Math.cos((coordinates.latitude * Math.PI) / 180), 0.2));

  return {
    latitude: coordinates.latitude + latitudeOffset,
    longitude: coordinates.longitude + longitudeOffset
  };
}
