import mapboxgl, {
  type EasingOptions,
  type LngLatBoundsLike,
  type PaddingOptions,
} from "mapbox-gl";

import type { Bbox } from "@imprint/types";

import { getPrefersReducedMotion } from "./motion";

const DEFAULT_STYLE = "mapbox://styles/mapbox/dark-v11";
const INITIAL_CENTER: [number, number] = [15, 50];
const INITIAL_ZOOM = 3.2;
const BOUNDS_DEBOUNCE_MS = 300;

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
    if (this.boundsDebounceTimer !== null) {
      clearTimeout(this.boundsDebounceTimer);
      this.boundsDebounceTimer = null;
    }

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
