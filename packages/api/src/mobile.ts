import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Chapter, Coordinates, MemoryPin } from "@imprint/types";

export interface Bounds {
  northEast: Coordinates;
  southWest: Coordinates;
}

export interface MemoryPinMapItem extends MemoryPin {
  chapter: Pick<Chapter, "id" | "title" | "color"> | null;
  thumbnailUrl?: string;
}

interface MemoryPinsInBoundsParams {
  bounds: Bounds;
  enabled?: boolean;
}

interface RawMemoryPinRow {
  id?: unknown;
  user_id?: unknown;
  title?: unknown;
  body?: unknown;
  media_urls?: unknown;
  chapter_id?: unknown;
  visibility?: unknown;
  pinned_at?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  location?: unknown;
  chapter?: {
    id?: unknown;
    title?: unknown;
    color?: unknown;
  } | null;
  chapter_title?: unknown;
  chapter_color?: unknown;
}

interface RawPinDetailRow extends RawMemoryPinRow {
  chapters?: {
    id?: unknown;
    title?: unknown;
    color?: unknown;
  } | null;
}

interface IpLocationResponse {
  latitude?: unknown;
  longitude?: unknown;
  city?: unknown;
}

const DEFAULT_CHAPTER_COLOR = "#38bdf8";
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let supabaseClient: SupabaseClient | null = null;

function hasSupabaseEnv() {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

export function createSupabaseMobileClient() {
  if (!hasSupabaseEnv()) {
    throw new Error("Supabase environment variables are not configured.");
  }

  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    });
  }

  return supabaseClient;
}

function isCoordinates(value: unknown): value is Coordinates {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.latitude === "number" &&
    Number.isFinite(candidate.latitude) &&
    typeof candidate.longitude === "number" &&
    Number.isFinite(candidate.longitude)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function asIsoString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : new Date().toISOString();
}

function parseLocationFromUnknown(location: unknown) {
  if (isCoordinates(location)) {
    return location;
  }

  if (isRecord(location)) {
    const coordinates = location.coordinates;
    if (
      Array.isArray(coordinates) &&
      coordinates.length >= 2 &&
      typeof coordinates[0] === "number" &&
      typeof coordinates[1] === "number"
    ) {
      return {
        latitude: coordinates[1],
        longitude: coordinates[0]
      } satisfies Coordinates;
    }
  }

  if (typeof location === "string") {
    const wktMatch = location.match(/POINT\((-?\d+(\.\d+)?) (-?\d+(\.\d+)?)\)/);
    if (wktMatch) {
      return {
        latitude: Number(wktMatch[3]),
        longitude: Number(wktMatch[1])
      } satisfies Coordinates;
    }

    try {
      const parsed = JSON.parse(location) as unknown;
      return parseLocationFromUnknown(parsed);
    } catch {
      return null;
    }
  }

  return null;
}

function parseRowLocation(row: RawMemoryPinRow) {
  if (typeof row.latitude === "number" && typeof row.longitude === "number") {
    return {
      latitude: row.latitude,
      longitude: row.longitude
    } satisfies Coordinates;
  }

  return parseLocationFromUnknown(row.location);
}

function createChapterFromRow(row: RawMemoryPinRow) {
  if (row.chapter && isRecord(row.chapter)) {
    const id = asString(row.chapter.id);
    const title = asString(row.chapter.title);
    if (id && title) {
      return {
        id,
        title,
        color: asString(row.chapter.color) ?? DEFAULT_CHAPTER_COLOR
      } satisfies Pick<Chapter, "id" | "title" | "color">;
    }
  }

  const chapterId = asString(row.chapter_id);
  const chapterTitle = asString(row.chapter_title);
  if (chapterId && chapterTitle) {
    return {
      id: chapterId,
      title: chapterTitle,
      color: asString(row.chapter_color) ?? DEFAULT_CHAPTER_COLOR
    } satisfies Pick<Chapter, "id" | "title" | "color">;
  }

  return null;
}

function createMemoryPinFromRow(row: RawMemoryPinRow): MemoryPinMapItem | null {
  const id = asString(row.id);
  const userId = asString(row.user_id);
  const title = asString(row.title);
  const location = parseRowLocation(row);

  if (!id || !userId || !title || !location) {
    return null;
  }

  const mediaUrls = asStringArray(row.media_urls);

  return {
    id,
    userId,
    location,
    title,
    body: asString(row.body) ?? undefined,
    mediaUrls,
    chapterId: asString(row.chapter_id) ?? undefined,
    visibility: (asString(row.visibility) ?? "private") as MemoryPin["visibility"],
    pinnedAt: asIsoString(row.pinned_at),
    createdAt: asIsoString(row.created_at),
    updatedAt: asIsoString(row.updated_at),
    chapter: createChapterFromRow(row),
    thumbnailUrl: mediaUrls[0]
  };
}

function isInBounds(pin: MemoryPinMapItem, bounds: Bounds) {
  const latitude = pin.location.latitude;
  const longitude = pin.location.longitude;

  return (
    latitude <= bounds.northEast.latitude &&
    latitude >= bounds.southWest.latitude &&
    longitude <= bounds.northEast.longitude &&
    longitude >= bounds.southWest.longitude
  );
}

async function getAuthenticatedUserId(client: SupabaseClient) {
  const { data, error } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user?.id ?? null;
}

async function fetchPinsViaRpc(client: SupabaseClient, userId: string, bounds: Bounds) {
  const { data, error } = await client.rpc("get_memory_pins_in_bounds", {
    viewer_user_id: userId,
    min_latitude: bounds.southWest.latitude,
    min_longitude: bounds.southWest.longitude,
    max_latitude: bounds.northEast.latitude,
    max_longitude: bounds.northEast.longitude
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as RawMemoryPinRow[];
}

async function fetchPinsViaFallbackQuery(client: SupabaseClient, userId: string, bounds: Bounds) {
  const { data, error } = await client
    .from("memory_pins")
    .select(
      "id,user_id,title,body,media_urls,chapter_id,visibility,pinned_at,created_at,updated_at,location,chapter:chapters(id,title,color)"
    )
    .eq("user_id", userId)
    .order("pinned_at", { ascending: false })
    .limit(250);

  if (error) {
    throw error;
  }

  return (data ?? []) as RawMemoryPinRow[];
}

async function fetchMemoryPinsInBounds(bounds: Bounds) {
  const client = createSupabaseMobileClient();
  const userId = await getAuthenticatedUserId(client);

  if (!userId) {
    return [] satisfies MemoryPinMapItem[];
  }

  try {
    const rows = await fetchPinsViaRpc(client, userId, bounds);
    return rows
      .map((row) => createMemoryPinFromRow(row))
      .filter((pin): pin is MemoryPinMapItem => pin !== null);
  } catch {
    const rows = await fetchPinsViaFallbackQuery(client, userId, bounds);
    return rows
      .map((row) => createMemoryPinFromRow(row))
      .filter((pin): pin is MemoryPinMapItem => pin !== null)
      .filter((pin) => isInBounds(pin, bounds));
  }
}

async function fetchMemoryPinDetail(pinId: string) {
  const client = createSupabaseMobileClient();
  const { data, error } = await client
    .from("memory_pins")
    .select(
      "id,user_id,title,body,media_urls,chapter_id,visibility,pinned_at,created_at,updated_at,location,chapters(id,title,color)"
    )
    .eq("id", pinId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as RawPinDetailRow;
  return createMemoryPinFromRow({
    ...row,
    chapter: row.chapters ?? null
  });
}

export function useMemoryPinsInBounds({ bounds, enabled = true }: MemoryPinsInBoundsParams) {
  return useQuery({
    queryKey: [
      "memory-pins",
      "bounds",
      bounds.southWest.latitude,
      bounds.southWest.longitude,
      bounds.northEast.latitude,
      bounds.northEast.longitude
    ],
    queryFn: async () => fetchMemoryPinsInBounds(bounds),
    enabled: enabled && hasSupabaseEnv(),
    staleTime: 30_000
  });
}

export function useMemoryPinDetail(pinId: string | null) {
  return useQuery({
    queryKey: ["memory-pin", pinId],
    queryFn: async () => {
      if (!pinId) {
        return null;
      }

      return fetchMemoryPinDetail(pinId);
    },
    enabled: pinId !== null && hasSupabaseEnv(),
    staleTime: 5 * 60_000
  });
}

export async function fetchIpCityLocation() {
  const response = await fetch("https://ipapi.co/json/");
  if (!response.ok) {
    throw new Error(`IP geolocation failed with status ${response.status}`);
  }

  const payload = (await response.json()) as IpLocationResponse;
  if (typeof payload.latitude !== "number" || typeof payload.longitude !== "number") {
    throw new Error("IP geolocation payload is missing coordinates.");
  }

  return {
    cityName: typeof payload.city === "string" ? payload.city : "your city",
    coordinates: {
      latitude: payload.latitude,
      longitude: payload.longitude
    } satisfies Coordinates
  };
}
