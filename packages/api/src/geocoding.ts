import type { PinLocation } from "@imprint/types";

import { ApiError } from "./errors";

const GEOCODE_V6_BASE = "https://api.mapbox.com/search/geocode/v6";
const GEOCODE_V5_BASE = "https://api.mapbox.com/geocoding/v5/mapbox.places";

const FORWARD_ALLOWED_TYPES = new Set([
  "address",
  "street",
  "neighborhood",
  "place",
  "locality",
  "district",
]);

const REVERSE_DISALLOWED_TYPES = new Set([
  "country",
  "region",
  "postcode",
  "block",
  "secondary_address",
]);

const REVERSE_PRIORITY = [
  "address",
  "locality",
  "place",
  "neighborhood",
  "street",
  "district",
] as const;

export interface GeocodeResult {
  id: string;
  name: string;
  placeFormatted: string | null;
  featureType: string;
  location: PinLocation;
}

export interface V6Feature {
  properties?: {
    mapbox_id?: string;
    feature_type?: string;
    name?: string;
    name_preferred?: string;
    place_formatted?: string;
    coordinates?: {
      longitude?: number;
      latitude?: number;
    };
  };
  geometry?: {
    coordinates?: [number, number];
  };
}

export interface V6Response {
  features?: V6Feature[];
}

interface V5Feature {
  id?: string;
  place_name?: string;
  center?: [number, number];
  place_type?: string[];
}

interface V5Response {
  features?: V5Feature[];
}

export interface ForwardGeocodeOptions {
  proximity?: PinLocation;
}

export function isGeocodeError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === "geocode_failed";
}

export function isMapboxTokenError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    (error.code === "mapbox_token_rejected" ||
      error.code === "mapbox_token_missing")
  );
}

function getMapboxToken(): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token) {
    throw new ApiError(
      "mapbox_token_missing",
      "NEXT_PUBLIC_MAPBOX_TOKEN is not set",
    );
  }

  return token;
}

function warnGeocodeFailure(status: number, url: URL, detail?: unknown): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const safeUrl = new URL(url);
  safeUrl.searchParams.delete("access_token");
  console.warn(
    `[geocoding] request failed (${String(status)}): ${safeUrl.toString()}`,
    detail,
  );
}

function throwForHttpStatus(status: number, url: URL): never {
  warnGeocodeFailure(status, url);

  if (status === 401 || status === 403) {
    throw new ApiError(
      "mapbox_token_rejected",
      "Mapbox token was rejected (check token restrictions)",
    );
  }

  throw new ApiError(
    "geocode_failed",
    `Geocoding request failed (${String(status)})`,
  );
}

function parseFeature(
  feature: V6Feature,
  mode: "forward" | "reverse",
): GeocodeResult | null {
  const props = feature.properties;

  if (!props) {
    return null;
  }

  const featureType = props.feature_type ?? "";

  if (REVERSE_DISALLOWED_TYPES.has(featureType)) {
    return null;
  }

  if (mode === "forward" && !FORWARD_ALLOWED_TYPES.has(featureType)) {
    return null;
  }

  const lng =
    props.coordinates?.longitude ?? feature.geometry?.coordinates?.[0];
  const lat =
    props.coordinates?.latitude ?? feature.geometry?.coordinates?.[1];

  if (typeof lng !== "number" || typeof lat !== "number") {
    return null;
  }

  const name = props.name_preferred ?? props.name ?? "";

  if (!name) {
    return null;
  }

  return {
    id: props.mapbox_id ?? `${String(lng)},${String(lat)}`,
    name,
    placeFormatted: props.place_formatted ?? null,
    featureType,
    location: { lng, lat },
  };
}

export function pickBestReverseFeature(data: V6Response): GeocodeResult | null {
  if (!Array.isArray(data.features)) {
    return null;
  }

  const byType = new Map<string, GeocodeResult>();

  for (const feature of data.features) {
    const parsed = parseFeature(feature, "reverse");

    if (parsed && !byType.has(parsed.featureType)) {
      byType.set(parsed.featureType, parsed);
    }
  }

  for (const featureType of REVERSE_PRIORITY) {
    const result = byType.get(featureType);

    if (result) {
      return result;
    }
  }

  return null;
}

function parseForwardResponse(data: V6Response): GeocodeResult[] {
  if (!Array.isArray(data.features)) {
    return [];
  }

  const results: GeocodeResult[] = [];

  for (const feature of data.features) {
    const parsed = parseFeature(feature, "forward");

    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}

function parseV5ForwardResponse(data: V5Response): GeocodeResult[] {
  if (!Array.isArray(data.features)) {
    return [];
  }

  const results: GeocodeResult[] = [];

  for (const feature of data.features) {
    const [lng, lat] = feature.center ?? [];
    const name = feature.place_name?.split(",")[0]?.trim() ?? feature.place_name;

    if (typeof lng !== "number" || typeof lat !== "number" || !name) {
      continue;
    }

    const featureType = feature.place_type?.[0] ?? "place";

    if (!FORWARD_ALLOWED_TYPES.has(featureType)) {
      continue;
    }

    results.push({
      id: feature.id ?? `${String(lng)},${String(lat)}`,
      name,
      placeFormatted: feature.place_name ?? null,
      featureType,
      location: { lng, lat },
    });
  }

  return results;
}

async function fetchGeocodeV6(url: URL): Promise<V6Response> {
  let response: Response;

  try {
    response = await fetch(url);
  } catch (error) {
    warnGeocodeFailure(0, url, error);
    throw new ApiError("geocode_failed", "Geocoding request failed (network)");
  }

  if (!response.ok) {
    throwForHttpStatus(response.status, url);
  }

  try {
    return (await response.json()) as V6Response;
  } catch (error) {
    warnGeocodeFailure(response.status, url, error);
    throw new ApiError(
      "geocode_failed",
      "Geocoding response parse failed",
    );
  }
}

async function fetchGeocodeV5(url: URL): Promise<V5Response> {
  let response: Response;

  try {
    response = await fetch(url);
  } catch (error) {
    warnGeocodeFailure(0, url, error);
    throw new ApiError("geocode_failed", "Geocoding request failed (network)");
  }

  if (!response.ok) {
    throwForHttpStatus(response.status, url);
  }

  try {
    return (await response.json()) as V5Response;
  } catch (error) {
    warnGeocodeFailure(response.status, url, error);
    throw new ApiError(
      "geocode_failed",
      "Geocoding response parse failed",
    );
  }
}

function appendProximity(
  url: URL,
  proximity: PinLocation | undefined,
): void {
  if (!proximity) {
    return;
  }

  url.searchParams.set(
    "proximity",
    `${String(proximity.lng)},${String(proximity.lat)}`,
  );
}

async function forwardGeocodeV6(
  trimmed: string,
  proximity?: PinLocation,
): Promise<GeocodeResult[]> {
  const url = new URL(`${GEOCODE_V6_BASE}/forward`);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("language", "ru");
  url.searchParams.set("limit", "5");
  appendProximity(url, proximity);
  url.searchParams.set("access_token", getMapboxToken());

  const data = await fetchGeocodeV6(url);

  return parseForwardResponse(data).slice(0, 5);
}

async function forwardGeocodeV5(
  trimmed: string,
  proximity?: PinLocation,
): Promise<GeocodeResult[]> {
  const encoded = encodeURIComponent(trimmed);
  const url = new URL(`${GEOCODE_V5_BASE}/${encoded}.json`);
  url.searchParams.set("language", "ru");
  url.searchParams.set("limit", "5");
  appendProximity(url, proximity);
  url.searchParams.set("access_token", getMapboxToken());

  const data = await fetchGeocodeV5(url);

  return parseV5ForwardResponse(data).slice(0, 5);
}

export async function reverseGeocode(
  lng: number,
  lat: number,
): Promise<GeocodeResult | null> {
  const url = new URL(`${GEOCODE_V6_BASE}/reverse`);
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("language", "ru");
  url.searchParams.set("access_token", getMapboxToken());

  const data = await fetchGeocodeV6(url);

  return pickBestReverseFeature(data);
}

export async function forwardGeocode(
  query: string,
  options?: ForwardGeocodeOptions,
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  const proximity = options?.proximity;

  try {
    const v6Results = await forwardGeocodeV6(trimmed, proximity);

    if (v6Results.length > 0) {
      return v6Results;
    }
  } catch (error) {
    if (error instanceof ApiError && isMapboxTokenError(error)) {
      throw error;
    }
  }

  return forwardGeocodeV5(trimmed, proximity);
}
