import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Bbox,
  CreatePinInput,
  Database,
  Pin,
  PinListItem,
  PinLocation,
  UpdatePinInput,
} from "@imprint/types";

import { ApiError, toApiError } from "./errors";
import {
  bboxToRpcArgs,
  locationToWkt,
  mapPinDetailRow,
  mapPinRow,
} from "./mappers";

type PinsClient = SupabaseClient<Database>;

export const WORLD_BBOX = [-180, -90, 180, 90] as const satisfies Bbox;

export interface ListInBoundsInput {
  bbox: Bbox;
  userId?: string;
  chapterId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface ListMineInput {
  chapterId?: string;
  from?: string;
  to?: string;
}

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

async function requireUser(client: PinsClient) {
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

  return user;
}

export async function createPin(
  client: PinsClient,
  input: CreatePinInput,
): Promise<{ id: string }> {
  const user = await requireUser(client);

  const { lng, lat } = input.location;
  const visibility = input.visibility ?? "private";
  const pinnedAt = input.pinnedAt ?? new Date().toISOString();

  const { data, error } = await client
    .from("memory_pins")
    .insert({
      user_id: user.id,
      chapter_id: input.chapterId ?? null,
      location: locationToWkt({ lng, lat }),
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

export async function listInBounds(
  client: PinsClient,
  input: ListInBoundsInput,
): Promise<PinListItem[]> {
  const { data, error } = await client.rpc("pins_in_bounds", {
    ...bboxToRpcArgs(input.bbox),
    p_user_id: input.userId ?? undefined,
    p_chapter_id: input.chapterId ?? undefined,
    p_from: input.from ?? undefined,
    p_to: input.to ?? undefined,
    p_limit: input.limit ?? undefined,
  });

  if (error) {
    throw toApiError(error);
  }

  return data.map(mapPinRow);
}

export async function listMine(
  client: PinsClient,
  input: ListMineInput = {},
): Promise<PinListItem[]> {
  const user = await requireUser(client);

  return listInBounds(client, {
    bbox: WORLD_BBOX,
    userId: user.id,
    chapterId: input.chapterId,
    from: input.from,
    to: input.to,
  });
}

export async function getById(
  client: PinsClient,
  id: string,
): Promise<Pin | null> {
  const { data, error } = await client.rpc("pin_by_id", { p_id: id });

  if (error) {
    throw toApiError(error);
  }

  const row = data[0];

  if (!row) {
    return null;
  }

  return mapPinDetailRow(row);
}

export async function updatePin(
  client: PinsClient,
  id: string,
  patch: UpdatePinInput,
): Promise<{ id: string }> {
  await requireUser(client);

  const update: Database["public"]["Tables"]["memory_pins"]["Update"] = {};

  if (patch.title !== undefined) {
    update.title = patch.title;
  }
  if (patch.body !== undefined) {
    update.body = patch.body;
  }
  if (patch.locationName !== undefined) {
    update.location_name = patch.locationName;
  }
  if (patch.visibility !== undefined) {
    update.visibility = patch.visibility;
  }
  if (patch.pinnedAt !== undefined) {
    update.pinned_at = patch.pinnedAt;
  }
  if (patch.chapterId !== undefined) {
    update.chapter_id = patch.chapterId;
  }
  if (patch.location !== undefined) {
    update.location = locationToWkt(patch.location);
  }

  const { data, error } = await client
    .from("memory_pins")
    .update(update)
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    throw toApiError(error);
  }

  return { id: data.id };
}

export async function deletePin(client: PinsClient, id: string): Promise<void> {
  await requireUser(client);

  const { error } = await client.from("memory_pins").delete().eq("id", id);

  if (error) {
    throw toApiError(error);
  }
}

export async function getMyPinById(
  client: PinsClient,
  pinId: string,
): Promise<{ id: string; location: PinLocation } | null> {
  await requireUser(client);

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
