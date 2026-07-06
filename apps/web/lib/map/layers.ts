import type mapboxgl from "mapbox-gl";
import type { FeatureCollection, Point } from "geojson";

import type { PinFeatureProperties } from "./geojson";

export const PINS_SOURCE_ID = "pins";
export const PINS_ZONE_LAYER_ID = "pins-zone";
export const PINS_EXACT_LAYER_ID = "pins-exact";
export const PIN_PULSE_LAYER_ID = "pin-pulse";
export const CLUSTERS_LAYER_ID = "clusters";
export const CLUSTER_COUNT_LAYER_ID = "cluster-count";

const INTERACTIVE_LAYERS = [
  PINS_EXACT_LAYER_ID,
  PINS_ZONE_LAYER_ID,
  CLUSTERS_LAYER_ID,
] as const;

export const INTERACTIVE_PIN_LAYERS = INTERACTIVE_LAYERS;

const EMPTY_FC: FeatureCollection<Point, PinFeatureProperties> = {
  type: "FeatureCollection",
  features: [],
};

const NIGHT_850 = "#0C1226";
const NIGHT_800 = "#131A30";
const INK_PRIMARY = "#F0F3FC";
const AMBER = "#EFB65A";

export interface PinInteractionHandlers {
  onPinClick: (pinId: string) => void;
  onMapClick: () => void;
}

export interface PinLayerController {
  setHoveredPin: (id: string | null) => void;
  expandCluster: (
    feature: mapboxgl.GeoJSONFeature,
    lngLat: mapboxgl.LngLat,
  ) => void;
  getHandlers: () => PinInteractionHandlers | null;
  isInCreateMode: () => boolean;
}

function resolveTextFont(map: mapboxgl.Map): string[] {
  const preferred = ["DIN Pro Medium", "Arial Unicode MS Regular"];
  const style = map.getStyle();

  if (style.glyphs) {
    return preferred;
  }

  for (const layer of style.layers) {
    if (layer.type === "symbol" && "layout" in layer && layer.layout) {
      const textFont = layer.layout["text-font"];
      if (Array.isArray(textFont) && textFont.every((f) => typeof f === "string")) {
        return textFont as string[];
      }
    }
  }

  return ["Open Sans Regular", "Arial Unicode MS Regular"];
}

export function registerPinLayers(
  map: mapboxgl.Map,
  controller: PinLayerController,
): () => void {
  if (map.getSource(PINS_SOURCE_ID)) {
    return () => undefined;
  }

  map.addSource(PINS_SOURCE_ID, {
    type: "geojson",
    data: EMPTY_FC,
    promoteId: "id",
    cluster: true,
    clusterMaxZoom: 13,
    clusterRadius: 44,
  });

  map.addLayer({
    id: PINS_ZONE_LAYER_ID,
    type: "circle",
    source: PINS_SOURCE_ID,
    filter: [
      "all",
      ["!", ["has", "point_count"]],
      ["==", ["get", "exact"], 0],
    ],
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        8,
        12,
        13,
        40,
      ],
      "circle-color": ["get", "color"],
      "circle-opacity": 0.18,
      "circle-stroke-width": 1,
      "circle-stroke-color": ["get", "color"],
      "circle-stroke-opacity": 0.4,
    },
  });

  map.addLayer({
    id: PINS_EXACT_LAYER_ID,
    type: "circle",
    source: PINS_SOURCE_ID,
    filter: [
      "all",
      ["!", ["has", "point_count"]],
      ["==", ["get", "exact"], 1],
    ],
    paint: {
      "circle-radius": [
        "case",
        ["boolean", ["feature-state", "active"], false],
        8,
        ["boolean", ["feature-state", "hover"], false],
        7,
        6,
      ],
      "circle-color": ["get", "color"],
      "circle-stroke-width": 2,
      "circle-stroke-color": NIGHT_850,
    },
  });

  map.addLayer({
    id: PIN_PULSE_LAYER_ID,
    type: "circle",
    source: PINS_SOURCE_ID,
    filter: [
      "all",
      ["!", ["has", "point_count"]],
      ["==", ["get", "exact"], 1],
      ["==", ["get", "id"], ""],
    ],
    paint: {
      "circle-radius": 8,
      "circle-color": "transparent",
      "circle-stroke-width": 2,
      "circle-stroke-color": ["get", "color"],
      "circle-stroke-opacity": 0.5,
    },
  });

  map.addLayer({
    id: CLUSTERS_LAYER_ID,
    type: "circle",
    source: PINS_SOURCE_ID,
    filter: ["has", "point_count"],
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        2,
        ["step", ["get", "point_count"], 22, 10, 26],
        8,
        ["step", ["get", "point_count"], 16, 10, 18],
        12,
        ["step", ["get", "point_count"], 16, 10, 18],
      ],
      "circle-color": NIGHT_800,
      "circle-stroke-width": 2,
      "circle-stroke-color": AMBER,
      "circle-stroke-opacity": 0.9,
    },
  });

  map.addLayer({
    id: CLUSTER_COUNT_LAYER_ID,
    type: "symbol",
    source: PINS_SOURCE_ID,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": resolveTextFont(map),
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        2,
        14,
        8,
        12,
      ],
    },
    paint: {
      "text-color": INK_PRIMARY,
    },
  });


  const getHandlers = () => controller.getHandlers();

  const handleMouseMove = (event: mapboxgl.MapMouseEvent) => {
    if (controller.isInCreateMode()) {
      return;
    }

    const feature = event.features?.[0];

    if (!feature) {
      return;
    }

    map.getCanvas().style.cursor = "pointer";

    if (feature.properties?.cluster) {
      controller.setHoveredPin(null);
      return;
    }

    const pinId = feature.properties?.id as string | undefined;

    if (typeof pinId === "string") {
      controller.setHoveredPin(pinId);
    }
  };

  const handleMouseLeave = () => {
    if (controller.isInCreateMode()) {
      map.getCanvas().style.cursor = "crosshair";
      return;
    }

    map.getCanvas().style.cursor = "";
    controller.setHoveredPin(null);
  };

  const handleClick = (event: mapboxgl.MapMouseEvent) => {
    if (controller.isInCreateMode()) {
      return;
    }

    const feature = event.features?.[0];

    if (!feature) {
      getHandlers()?.onMapClick();
      return;
    }

    if (feature.properties?.cluster) {
      controller.expandCluster(feature, event.lngLat);
      return;
    }

    const pinId = feature.properties?.id as string | undefined;

    if (typeof pinId === "string") {
      getHandlers()?.onPinClick(pinId);
    }
  };

  const handleMapClick = (event: mapboxgl.MapMouseEvent) => {
    if (controller.isInCreateMode()) {
      return;
    }

    const features = map.queryRenderedFeatures(event.point, {
      layers: [...INTERACTIVE_LAYERS],
    });

    if (features.length === 0) {
      getHandlers()?.onMapClick();
    }
  };

  for (const layerId of INTERACTIVE_LAYERS) {
    map.on("mousemove", layerId, handleMouseMove);
    map.on("mouseleave", layerId, handleMouseLeave);
    map.on("click", layerId, handleClick);
  }

  map.on("click", handleMapClick);

  return () => {
    for (const layerId of INTERACTIVE_LAYERS) {
      map.off("mousemove", layerId, handleMouseMove);
      map.off("mouseleave", layerId, handleMouseLeave);
      map.off("click", layerId, handleClick);
    }

    map.off("click", handleMapClick);

    if (map.getLayer(CLUSTER_COUNT_LAYER_ID)) {
      map.removeLayer(CLUSTER_COUNT_LAYER_ID);
    }
    if (map.getLayer(CLUSTERS_LAYER_ID)) {
      map.removeLayer(CLUSTERS_LAYER_ID);
    }
    if (map.getLayer(PIN_PULSE_LAYER_ID)) {
      map.removeLayer(PIN_PULSE_LAYER_ID);
    }
    if (map.getLayer(PINS_EXACT_LAYER_ID)) {
      map.removeLayer(PINS_EXACT_LAYER_ID);
    }
    if (map.getLayer(PINS_ZONE_LAYER_ID)) {
      map.removeLayer(PINS_ZONE_LAYER_ID);
    }
    if (map.getSource(PINS_SOURCE_ID)) {
      map.removeSource(PINS_SOURCE_ID);
    }
  };
}
