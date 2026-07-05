import type { SupabaseClient } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import type { Coordinates } from "@imprint/types";
import { hasSupabaseEnv } from "./supabase/env";
import {
  createMemoryPinFromRow,
  isInBounds,
  type Bounds,
  type MemoryPinMapItem,
  type RawMemoryPinRow,
  type RawPinDetailRow
} from "./supabase/mappers";
import { getSupabaseClient } from "./supabase/runtime";

interface IpLocationResponse {
  latitude?: unknown;
  longitude?: unknown;
  city?: unknown;
}

interface MemoryPinsInBoundsParams {
  bounds: Bounds;
  enabled?: boolean;
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

export async function fetchMemoryPinsInBounds(
  bounds: Bounds,
  client: SupabaseClient = getSupabaseClient()
) {
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

export async function fetchMemoryPinDetail(
  pinId: string,
  client: SupabaseClient = getSupabaseClient()
) {
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

export type { Bounds, MemoryPinMapItem };
