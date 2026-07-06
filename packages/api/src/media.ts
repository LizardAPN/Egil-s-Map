import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, PinMedia } from "@imprint/types";

import { ApiError, toApiError } from "./errors";
import {
  buildPinMediaStoragePath,
  type UploadProgress,
} from "./media-shared";

type MediaClient = SupabaseClient<Database>;

const MEDIA_BUCKET = "media";
const SIGNED_URL_TTL_SECONDS = 3600;

type PinMediaRow = Database["public"]["Tables"]["pin_media"]["Row"];

async function requireUser(client: MediaClient) {
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

function mapPinMediaRow(
  row: PinMediaRow,
  signedUrl: string | null,
): PinMedia {
  return {
    id: row.id,
    position: row.position,
    url: signedUrl ?? "",
    storagePath: row.storage_path,
    width: row.width,
    height: row.height,
    blurhash: row.blurhash,
    mediaType: row.media_type === "video" ? "video" : "image",
  };
}

async function attachSignedUrls(
  client: MediaClient,
  rows: PinMediaRow[],
): Promise<PinMedia[]> {
  if (rows.length === 0) {
    return [];
  }

  const paths = rows.map((row) => row.storage_path);
  const { data, error } = await client.storage
    .from(MEDIA_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error) {
    throw toApiError(error);
  }

  return rows.map((row, index) =>
    mapPinMediaRow(row, data[index]?.signedUrl ?? null),
  );
}

async function getMaxPosition(
  client: MediaClient,
  pinId: string,
): Promise<number> {
  const { data, error } = await client
    .from("pin_media")
    .select("position")
    .eq("pin_id", pinId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw toApiError(error);
  }

  return data?.position ?? -1;
}

export async function uploadPinMedia(
  client: MediaClient,
  pinId: string,
  files: File[],
  onProgress?: (progress: UploadProgress) => void,
): Promise<PinMedia[]> {
  const { prepareImage } = await import("./media-prepare");
  const user = await requireUser(client);
  let position = await getMaxPosition(client, pinId);
  const createdRows: PinMediaRow[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    if (!file) {
      continue;
    }

    onProgress?.({ index, total: files.length, phase: "preparing" });

    const prepared = await prepareImage(file);
    const fileId = crypto.randomUUID();
    const storagePath = buildPinMediaStoragePath(user.id, pinId, fileId);

    onProgress?.({ index, total: files.length, phase: "uploading" });

    const { error: uploadError } = await client.storage
      .from(MEDIA_BUCKET)
      .upload(storagePath, prepared.blob, {
        contentType: "image/webp",
        upsert: false,
      });

    if (uploadError) {
      throw toApiError(uploadError);
    }

    position += 1;

    onProgress?.({ index, total: files.length, phase: "saving" });

    const { data, error: insertError } = await client
      .from("pin_media")
      .insert({
        pin_id: pinId,
        position,
        media_type: "image",
        storage_path: storagePath,
        width: prepared.width,
        height: prepared.height,
        blurhash: prepared.blurhash,
      })
      .select("*")
      .single();

    if (insertError) {
      await client.storage.from(MEDIA_BUCKET).remove([storagePath]);
      throw toApiError(insertError);
    }

    createdRows.push(data);
  }

  return attachSignedUrls(client, createdRows);
}

export async function listPinMedia(
  client: MediaClient,
  pinId: string,
): Promise<PinMedia[]> {
  const { data, error } = await client
    .from("pin_media")
    .select("*")
    .eq("pin_id", pinId)
    .order("position", { ascending: true });

  if (error) {
    throw toApiError(error);
  }

  return attachSignedUrls(client, data);
}

export async function deletePinMedia(
  client: MediaClient,
  media: Pick<PinMedia, "id" | "storagePath">,
): Promise<void> {
  await requireUser(client);

  const { error: deleteRowError } = await client
    .from("pin_media")
    .delete()
    .eq("id", media.id);

  if (deleteRowError) {
    throw toApiError(deleteRowError);
  }

  await client.storage.from(MEDIA_BUCKET).remove([media.storagePath]);
}

export async function reorderPinMedia(
  client: MediaClient,
  pinId: string,
  orderedIds: string[],
): Promise<void> {
  await requireUser(client);

  for (let position = 0; position < orderedIds.length; position += 1) {
    const id = orderedIds[position];

    if (!id) {
      continue;
    }

    const { error } = await client
      .from("pin_media")
      .update({ position })
      .eq("id", id)
      .eq("pin_id", pinId);

    if (error) {
      throw toApiError(error);
    }
  }
}

export async function removePinStorageFolder(
  client: MediaClient,
  userId: string,
  pinId: string,
): Promise<void> {
  const prefix = `${userId}/${pinId}`;
  const { data, error } = await client.storage.from(MEDIA_BUCKET).list(prefix);

  if (error || data.length === 0) {
    return;
  }

  const paths = data
    .filter((item) => item.name)
    .map((item) => `${prefix}/${item.name}`);

  if (paths.length === 0) {
    return;
  }

  await client.storage.from(MEDIA_BUCKET).remove(paths);
}
