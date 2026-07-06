import type { FeatureCollection, Point } from "geojson";
import mapboxgl, {
  type EasingOptions,
  type LngLatBoundsLike,
  type PaddingOptions,
} from "mapbox-gl";

import type { Bbox } from "@imprint/types";

import type { PinFeatureProperties } from "./geojson";
import {
  PIN_PULSE_LAYER_ID,
  PINS_SOURCE_ID,
  registerPinLayers,
  type PinInteractionHandlers,
} from "./layers";
import { getPrefersReducedMotion } from "./motion";

const DEFAULT_STYLE = "mapbox://styles/mapbox/dark-v11";
const INITIAL_CENTER: [number, number] = [15, 50];
const INITIAL_ZOOM = 3.2;
const BOUNDS_DEBOUNCE_MS = 300;
const PULSE_DURATION_MS = 1800;

const NIGHT_950_FOG = "rgb(7, 11, 22)";

export interface MapCamera {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface FlyToPinOptions {
  zoom?: number;
  duration?: number;
  curve?: number;
}

export interface BoundsChangedPayload {
  bbox: Bbox;
  zoom: number;
}

export interface MapControllerOptions {
  style?: string;
}

type ReadyCallback = () => void;
type BoundsChangedCallback = (payload: BoundsChangedPayload) => void;

let singleton: MapController | null = null;

function getMapboxToken(): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token) {
    throw new Error(
      "NEXT_PUBLIC_MAPBOX_TOKEN is not set. Add it to apps/web/.env.local",
    );
  }

  return token;
}

function getMapboxStyle(): string {
  return process.env.NEXT_PUBLIC_MAPBOX_STYLE ?? DEFAULT_STYLE;
}

function boundsToBbox(bounds: mapboxgl.LngLatBounds): Bbox {
  const [west, south] = bounds.getSouthWest().toArray();
  const [east, north] = bounds.getNorthEast().toArray();

  return [west, south, east, north];
}

export class MapController {
  private readonly map: mapboxgl.Map;
  private container: HTMLElement;
  private readonly readyCallbacks = new Set<ReadyCallback>();
  private readonly boundsChangedCallbacks = new Set<BoundsChangedCallback>();
  private isReady = false;
  private boundsDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly handleMoveEnd: () => void;
  private readonly handleLoad: () => void;
  private readonly handleStyleLoad: () => void;
  private pinsLayersRegistered = false;
  private teardownPinLayers: (() => void) | null = null;
  private hoveredPinId: string | null = null;
  private activePinId: string | null = null;
  private pulseFrameId: number | null = null;
  private pulseStartTime: number | null = null;
  private pinInteractionHandlers: PinInteractionHandlers | null = null;
  private pendingPinsData: FeatureCollection<Point, PinFeatureProperties> | null =
    null;

  private constructor(container: HTMLElement, options?: MapControllerOptions) {
    this.container = container;

    mapboxgl.accessToken = getMapboxToken();

    this.map = new mapboxgl.Map({
      container,
      style: options?.style ?? getMapboxStyle(),
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      projection: "globe",
      attributionControl: false,
    });

    this.map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right",
    );

    this.handleStyleLoad = () => {
      this.map.setFog({
        color: NIGHT_950_FOG,
        "high-color": NIGHT_950_FOG,
        "horizon-blend": 0.02,
        "space-color": NIGHT_950_FOG,
        "star-intensity": 0,
      });
    };

    this.handleLoad = () => {
      this.isReady = true;
      this.map.resize();
      this.emitBoundsChanged();
      this.readyCallbacks.forEach((callback) => {
        callback();
      });
    };

    this.handleMoveEnd = () => {
      if (this.boundsDebounceTimer !== null) {
        clearTimeout(this.boundsDebounceTimer);
      }

      this.boundsDebounceTimer = setTimeout(() => {
        this.emitBoundsChanged();
      }, BOUNDS_DEBOUNCE_MS);
    };

    this.map.on("style.load", this.handleStyleLoad);
    this.map.on("load", this.handleLoad);
    this.map.on("moveend", this.handleMoveEnd);
  }

  static create(
    container: HTMLElement,
    options?: MapControllerOptions,
  ): MapController {
    if (singleton) {
      if (singleton.container !== container) {
        const mapContainer = singleton.map.getContainer();
        if (mapContainer.parentElement !== container) {
          container.appendChild(mapContainer);
        }
        singleton.container = container;
      }

      singleton.map.resize();
      return singleton;
    }

    singleton = new MapController(container, options);
    console.info("[map] created");
    return singleton;
  }

  static getInstance(): MapController | null {
    return singleton;
  }

  onReady(callback: ReadyCallback): () => void {
    if (this.isReady) {
      callback();
    } else {
      this.readyCallbacks.add(callback);
    }

    return () => {
      this.readyCallbacks.delete(callback);
    };
  }

  onBoundsChanged(callback: BoundsChangedCallback): () => void {
    this.boundsChangedCallbacks.add(callback);

    if (this.isReady) {
      callback(this.getBoundsPayload());
    }

    return () => {
      this.boundsChangedCallbacks.delete(callback);
    };
  }

  initPinLayers(): void {
    if (this.pinsLayersRegistered) {
      return;
    }

    const register = () => {
      if (this.pinsLayersRegistered) {
        return;
      }

      this.teardownPinLayers = registerPinLayers(this.map, {
        setHoveredPin: (id) => {
          this.setHoveredPin(id);
        },
        expandCluster: (feature, lngLat) => {
          this.expandCluster(feature, lngLat);
        },
        getHandlers: () => this.pinInteractionHandlers,
      });

      this.pinsLayersRegistered = true;

      if (this.pendingPinsData) {
        this.setPinsData(this.pendingPinsData);
      }
    };

    if (this.isReady) {
      register();
    } else {
      this.onReady(register);
    }
  }

  setPinsData(
    featureCollection: FeatureCollection<Point, PinFeatureProperties>,
  ): void {
    this.pendingPinsData = featureCollection;

    const source = this.map.getSource(PINS_SOURCE_ID);

    if (!source || source.type !== "geojson") {
      return;
    }

    source.setData(featureCollection);
    this.reapplyPinVisualState();
  }

  setPinInteractionHandlers(handlers: PinInteractionHandlers): void {
    this.pinInteractionHandlers = handlers;
  }

  setHoveredPin(id: string | null): void {
    if (!this.map.getSource(PINS_SOURCE_ID)) {
      return;
    }

    if (this.hoveredPinId && this.hoveredPinId !== id) {
      this.map.setFeatureState(
        { source: PINS_SOURCE_ID, id: this.hoveredPinId },
        { hover: false },
      );
    }

    this.hoveredPinId = id;

    if (id) {
      this.map.setFeatureState({ source: PINS_SOURCE_ID, id }, { hover: true });
    }
  }

  setActivePin(id: string | null): void {
    if (!this.map.getSource(PINS_SOURCE_ID)) {
      return;
    }

    if (this.activePinId && this.activePinId !== id) {
      this.map.setFeatureState(
        { source: PINS_SOURCE_ID, id: this.activePinId },
        { active: false },
      );
    }

    this.activePinId = id;

    if (id) {
      this.map.setFeatureState({ source: PINS_SOURCE_ID, id }, { active: true });
    }

    if (this.map.getLayer(PIN_PULSE_LAYER_ID)) {
      this.map.setFilter(PIN_PULSE_LAYER_ID, this.pulseFilterFor(this.activePinId));
    }

    this.stopPulseAnimation();

    if (id && !getPrefersReducedMotion()) {
      this.startPulseAnimation();
    }
  }

  expandCluster(
    feature: mapboxgl.GeoJSONFeature,
    lngLat: mapboxgl.LngLat,
  ): void {
    const source = this.map.getSource(PINS_SOURCE_ID);

    if (!source || source.type !== "geojson") {
      return;
    }

    const rawClusterId: unknown = feature.properties?.cluster_id;

    if (typeof rawClusterId !== "number") {
      return;
    }

    const clusterId = rawClusterId;

    source.getClusterExpansionZoom(clusterId, (error, zoom) => {
      if (error || zoom === undefined || zoom === null) {
        return;
      }

      const center: [number, number] = [lngLat.lng, lngLat.lat];

      if (getPrefersReducedMotion()) {
        this.map.jumpTo({ center, zoom });
        return;
      }

      this.map.easeTo({ center, zoom });
    });
  }

  flyToPin(
    { lng, lat }: { lng: number; lat: number },
    options?: FlyToPinOptions,
  ): void {
    const zoom = options?.zoom ?? 13;
    const center: [number, number] = [lng, lat];

    if (getPrefersReducedMotion()) {
      this.map.jumpTo({ center, zoom });
      return;
    }

    this.map.flyTo({
      center,
      zoom,
      duration: options?.duration ?? 700,
      curve: options?.curve ?? 1.4,
    });
  }

  fitBounds(
    bounds: LngLatBoundsLike,
    padding?: number | PaddingOptions,
    options?: EasingOptions,
  ): void {
    this.map.fitBounds(bounds, {
      ...options,
      ...(padding !== undefined ? { padding } : {}),
    });
  }

  easeToZoom(delta: number): void {
    this.map.easeTo({ zoom: this.map.getZoom() + delta });
  }

  getCamera(): MapCamera {
    const center = this.map.getCenter();

    return {
      center: [center.lng, center.lat],
      zoom: this.map.getZoom(),
      bearing: this.map.getBearing(),
      pitch: this.map.getPitch(),
    };
  }

  resize(): void {
    this.map.resize();
  }

  destroy(): void {
    this.stopPulseAnimation();

    if (this.boundsDebounceTimer !== null) {
      clearTimeout(this.boundsDebounceTimer);
      this.boundsDebounceTimer = null;
    }

    this.teardownPinLayers?.();
    this.teardownPinLayers = null;
    this.pinsLayersRegistered = false;

    this.map.off("style.load", this.handleStyleLoad);
    this.map.off("load", this.handleLoad);
    this.map.off("moveend", this.handleMoveEnd);

    this.readyCallbacks.clear();
    this.boundsChangedCallbacks.clear();
    this.map.remove();

    if (singleton === this) {
      singleton = null;
    }
  }

  private pulseFilterFor(pinId: string | null): mapboxgl.FilterSpecification {
    if (!pinId) {
      return [
        "all",
        ["!", ["has", "point_count"]],
        ["==", ["get", "exact"], 1],
        ["==", ["get", "id"], ""],
      ];
    }

    return [
      "all",
      ["!", ["has", "point_count"]],
      ["==", ["get", "exact"], 1],
      ["==", ["get", "id"], pinId],
    ];
  }

  private reapplyPinVisualState(): void {
    if (!this.map.getSource(PINS_SOURCE_ID)) {
      return;
    }

    if (this.hoveredPinId) {
      this.map.setFeatureState(
        { source: PINS_SOURCE_ID, id: this.hoveredPinId },
        { hover: true },
      );
    }

    if (!this.activePinId) {
      if (this.map.getLayer(PIN_PULSE_LAYER_ID)) {
        this.map.setFilter(PIN_PULSE_LAYER_ID, this.pulseFilterFor(null));
      }
      this.stopPulseAnimation();
      return;
    }

    this.map.setFeatureState(
      { source: PINS_SOURCE_ID, id: this.activePinId },
      { active: true },
    );

    if (this.map.getLayer(PIN_PULSE_LAYER_ID)) {
      this.map.setFilter(
        PIN_PULSE_LAYER_ID,
        this.pulseFilterFor(this.activePinId),
      );
    }

    this.stopPulseAnimation();

    if (!getPrefersReducedMotion()) {
      this.startPulseAnimation();
    }
  }

  private startPulseAnimation(): void {
    this.pulseStartTime = performance.now();

    const tick = (now: number) => {
      if (!this.activePinId || getPrefersReducedMotion()) {
        this.stopPulseAnimation();
        return;
      }

      const start = this.pulseStartTime ?? now;
      const elapsed = (now - start) % PULSE_DURATION_MS;
      const progress = elapsed / PULSE_DURATION_MS;
      const radius = 8 + progress * 10;
      const opacity = 0.5 * (1 - progress);

      if (this.map.getLayer(PIN_PULSE_LAYER_ID)) {
        this.map.setPaintProperty(PIN_PULSE_LAYER_ID, "circle-radius", radius);
        this.map.setPaintProperty(
          PIN_PULSE_LAYER_ID,
          "circle-stroke-opacity",
          opacity,
        );
      }

      this.pulseFrameId = requestAnimationFrame(tick);
    };

    this.pulseFrameId = requestAnimationFrame(tick);
  }

  private stopPulseAnimation(): void {
    if (this.pulseFrameId !== null) {
      cancelAnimationFrame(this.pulseFrameId);
      this.pulseFrameId = null;
    }

    this.pulseStartTime = null;

    if (this.map.getLayer(PIN_PULSE_LAYER_ID)) {
      this.map.setPaintProperty(PIN_PULSE_LAYER_ID, "circle-radius", 8);
      this.map.setPaintProperty(PIN_PULSE_LAYER_ID, "circle-stroke-opacity", 0);
    }
  }

  private getBoundsPayload(): BoundsChangedPayload {
    const bounds = this.map.getBounds();

    if (!bounds) {
      return {
        bbox: [-180, -90, 180, 90],
        zoom: this.map.getZoom(),
      };
    }

    return {
      bbox: boundsToBbox(bounds),
      zoom: this.map.getZoom(),
    };
  }

  private emitBoundsChanged(): void {
    const payload = this.getBoundsPayload();

    this.boundsChangedCallbacks.forEach((callback) => {
      callback(payload);
    });
  }
}
