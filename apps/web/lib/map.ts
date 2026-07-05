import type { Map as MapboxMap } from "mapbox-gl";
import type { Coordinates } from "@imprint/types";

export const MAPBOX_DARK_STYLE = "mapbox://styles/mapbox/dark-v11";
export const CLUSTER_BREAKPOINT = 12;
export const FLY_TO_DURATION_MS = 800;

export function flyToMap(
  map: MapboxMap,
  coordinates: Coordinates,
  zoom?: number
) {
  map.flyTo({
    center: [coordinates.longitude, coordinates.latitude],
    zoom: zoom ?? map.getZoom(),
    duration: FLY_TO_DURATION_MS,
    essential: true
  });
}

export function coordinatesToLngLat(coordinates: Coordinates): [number, number] {
  return [coordinates.longitude, coordinates.latitude];
}

export function boundsFromMap(map: MapboxMap) {
  const bounds = map.getBounds();
  if (!bounds) {
    return null;
  }

  return {
    northEast: {
      latitude: bounds.getNorthEast().lat,
      longitude: bounds.getNorthEast().lng
    },
    southWest: {
      latitude: bounds.getSouthWest().lat,
      longitude: bounds.getSouthWest().lng
    }
  };
}
