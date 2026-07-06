import type { PinLocation } from "@imprint/types";

import { ApiError } from "./errors";

const GEOCODE_BASE = "https://api.mapbox.com/search/geocode/v6";
const ALLOWED_TYPES = new Set(["place", "locality", "poi"]);

export interface GeocodeResult {
  id: string;
  name: string;
  placeFormatted: string | null;
  featureType: string;
  location: PinLocation;
}

interface V6Feature {
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

interface V6Response {
  features?: V6Feature[];
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

function parseFeature(feature: V6Feature): GeocodeResult | null {
  const props = feature.properties;

  if (!props) {
    return null;
  }

  const featureType = props.feature_type ?? "";

  if (!ALLOWED_TYPES.has(featureType)) {
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

function parseResponse(data: V6Response): GeocodeResult[] {
  if (!Array.isArray(data.features)) {
    return [];
  }

  const results: GeocodeResult[] = [];

  for (const feature of data.features) {
    const parsed = parseFeature(feature);

    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}

async function fetchGeocode(url: URL): Promise<V6Response> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new ApiError(
      "geocode_failed",
      `Geocoding request failed (${String(response.status)})`,
    );
  }

  return (await response.json()) as V6Response;
}

export async function reverseGeocode(
  lng: number,
  lat: number,
): Promise<GeocodeResult | null> {
  const url = new URL(`${GEOCODE_BASE}/reverse`);
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("language", "ru");
  url.searchParams.set("types", "place,locality,poi");
  url.searchParams.set("access_token", getMapboxToken());

  const data = await fetchGeocode(url);
  const results = parseResponse(data);

  return results[0] ?? null;
}

export async function forwardGeocode(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  const url = new URL(`${GEOCODE_BASE}/forward`);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("language", "ru");
  url.searchParams.set("limit", "5");
  url.searchParams.set("types", "place,locality,poi");
  url.searchParams.set("access_token", getMapboxToken());

  const data = await fetchGeocode(url);

  return parseResponse(data).slice(0, 5);
}
