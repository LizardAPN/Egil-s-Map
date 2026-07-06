import type { PinListItem } from "@imprint/types";
import type { Feature, FeatureCollection, Point } from "geojson";

import { DEFAULT_CHAPTER_COLOR } from "../chapter-colors";

export interface PinFeatureProperties {
  id: string;
  color: string;
  exact: 0 | 1;
  active: 0 | 1;
}

export type PinFeature = Feature<Point, PinFeatureProperties>;

export function pinsToFeatureCollection(
  pins: PinListItem[],
  activePinId: string | null,
  chapterColors: ReadonlyMap<string, string>,
): FeatureCollection<Point, PinFeatureProperties> {
  const features: PinFeature[] = pins.map((pin) => {
    const color =
      (pin.chapterId ? chapterColors.get(pin.chapterId) : undefined) ??
      DEFAULT_CHAPTER_COLOR;

    return {
      type: "Feature",
      id: pin.id,
      geometry: {
        type: "Point",
        coordinates: [pin.location.lng, pin.location.lat],
      },
      properties: {
        id: pin.id,
        color,
        exact: pin.locationExact ? 1 : 0,
        active: pin.id === activePinId ? 1 : 0,
      },
    };
  });

  return {
    type: "FeatureCollection",
    features,
  };
}
