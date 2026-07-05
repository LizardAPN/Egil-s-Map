import type { SupabaseClient } from "@supabase/supabase-js";

import type { CreatePinInput, Database, PinLocation } from "@imprint/types";

import { ApiError, toApiError } from "./errors";

type PinsClient = SupabaseClient<Database>;

function parsePinLocation(geojson: unknown): PinLocation | null {
  if (
    typeof geojson !== "object" ||
    geojson === null ||
    !("coordinates" in geojson)
  ) {
    return null;
  }

  const coordinates = (geojson as { coordinates?: unknown }).coordinates;

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const lng: unknown = coordinates[0];
  const lat: unknown = coordinates[1];

  if (typeof lng !== "number" || typeof lat !== "number") {
    return null;
  }

  return { lng, lat };
}

export async function createPin(
  client: PinsClient,
  input: CreatePinInput,
): Promise<{ id: string }> {
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError) {
    throw toApiError(authError);
  }

  if (!user) {
    throw new ApiError("not_authenticated", "Not signed in");
  }

  const { lng, lat } = input.location;
  const visibility = input.visibility ?? "private";
  const pinnedAt = input.pinnedAt ?? new Date().toISOString();

  const { data, error } = await client
    .from("memory_pins")
    .insert({
      user_id: user.id,
      chapter_id: input.chapterId ?? null,
      location: `POINT(${String(lng)} ${String(lat)})`,
      location_name: input.locationName ?? null,
      title: input.title,
      body: input.body ?? null,
      visibility,
      pinned_at: pinnedAt,
    })
    .select("id")
    .single();

  if (error) {
    throw toApiError(error);
  }

  return { id: data.id };
}

export async function getMyPinById(
  client: PinsClient,
  pinId: string,
): Promise<{ id: string; location: PinLocation } | null> {
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError) {
    throw toApiError(authError);
  }

  if (!user) {
    throw new ApiError("not_authenticated", "Not signed in");
  }

  const { data, error } = await client.rpc("get_my_pin_location", {
    pin_id: pinId,
  });

  if (error) {
    throw toApiError(error);
  }

  if (data === null) {
    return null;
  }

  const location = parsePinLocation(data);

  if (!location) {
    return null;
  }

  return { id: pinId, location };
}
