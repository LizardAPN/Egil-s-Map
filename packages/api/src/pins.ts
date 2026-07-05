import type { SupabaseClient } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Bounds, MemoryPinMapItem } from "./supabase/mappers";

export type { Bounds, MemoryPinMapItem } from "./supabase/mappers";
import { getSupabaseClient } from "./supabase/runtime";
import type { Chapter, Coordinates, MemoryPin } from "@imprint/types";

export interface ChapterOption extends Pick<Chapter, "id" | "title" | "color"> {}

export interface LocalMediaAsset {
  uri: string;
  type: "image" | "video";
  fileName?: string | undefined;
  mimeType?: string | undefined;
  file?: File | undefined;
}

export interface CreateMemoryPinInput {
  title: string;
  body: string;
  pinnedAt: string;
  visibility: MemoryPin["visibility"];
  location: Coordinates;
  mediaAssets: LocalMediaAsset[];
  chapterId?: string | undefined;
  newChapterTitle?: string | undefined;
}

export interface CreateMemoryPinResult {
  pin: MemoryPinMapItem;
}

export interface UploadProgress {
  completed: number;
  total: number;
  percent: number;
}

type QueryClientLike = ReturnType<typeof useQueryClient>;

interface InsertChapterRow {
  id: string;
  title: string;
  color?: string | null;
}

interface InsertMemoryPinRow {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  media_urls: string[] | null;
  chapter_id: string | null;
  visibility: MemoryPin["visibility"];
  pinned_at: string;
  created_at: string;
  updated_at: string;
  latitude?: number | null;
  longitude?: number | null;
  location?: unknown;
  chapters?: InsertChapterRow | null;
}

const STORAGE_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_MEMORY_BUCKET ?? "memory-media";
const DEFAULT_CHAPTER_COLOR = "#38bdf8";

function chapterColor(color?: string | null) {
  return color ?? DEFAULT_CHAPTER_COLOR;
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function inferFileExtension(asset: LocalMediaAsset) {
  const explicitFileName = asset.fileName;
  if (explicitFileName?.includes(".")) {
    return explicitFileName.split(".").pop() ?? (asset.type === "video" ? "mp4" : "jpg");
  }

  if (asset.mimeType?.includes("/")) {
    return asset.mimeType.split("/")[1] ?? (asset.type === "video" ? "mp4" : "jpg");
  }

  return asset.type === "video" ? "mp4" : "jpg";
}

function buildStoragePath(userId: string, asset: LocalMediaAsset, index: number) {
  const extension = inferFileExtension(asset);
  const timestamp = Date.now();
  const fileName = sanitizeFileName(asset.fileName ?? `memory-${index}.${extension}`);
  return `${userId}/${timestamp}-${index}-${fileName}`;
}

async function fetchAssetBlob(asset: LocalMediaAsset) {
  if (asset.file) {
    return asset.file;
  }

  const response = await fetch(asset.uri);
  if (!response.ok) {
    throw new Error(`Could not read local media asset: ${response.status}`);
  }

  return response.blob();
}

function parseLocation(row: InsertMemoryPinRow): Coordinates {
  if (typeof row.latitude === "number" && typeof row.longitude === "number") {
    return {
      latitude: row.latitude,
      longitude: row.longitude
    };
  }

  if (typeof row.location === "object" && row.location !== null) {
    const candidate = row.location as { coordinates?: unknown };
    if (
      Array.isArray(candidate.coordinates) &&
      candidate.coordinates.length >= 2 &&
      typeof candidate.coordinates[0] === "number" &&
      typeof candidate.coordinates[1] === "number"
    ) {
      return {
        latitude: candidate.coordinates[1],
        longitude: candidate.coordinates[0]
      };
    }
  }

  if (typeof row.location === "string") {
    const wktMatch = row.location.match(/POINT\((-?\d+(\.\d+)?) (-?\d+(\.\d+)?)\)/);
    if (wktMatch) {
      return {
        latitude: Number(wktMatch[3]),
        longitude: Number(wktMatch[1])
      };
    }
  }

  throw new Error("Created memory pin did not include coordinates.");
}

function mapPinRow(row: InsertMemoryPinRow): MemoryPinMapItem {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body ?? undefined,
    mediaUrls: row.media_urls ?? [],
    chapterId: row.chapter_id ?? undefined,
    visibility: row.visibility,
    pinnedAt: row.pinned_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    location: parseLocation(row),
    chapter: row.chapters
      ? {
          id: row.chapters.id,
          title: row.chapters.title,
          color: chapterColor(row.chapters.color)
        }
      : null,
    thumbnailUrl: row.media_urls?.[0]
  };
}

async function getCurrentUserId(client: SupabaseClient) {
  const { data, error } = await client.auth.getUser();
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("session")) {
      throw new Error("Sign in to save your memory.");
    }
    throw error;
  }

  if (!data.user?.id) {
    throw new Error("Sign in to save your memory.");
  }

  return data.user.id;
}

async function uploadMediaAssets(
  client: SupabaseClient,
  userId: string,
  assets: LocalMediaAsset[],
  onProgress?: (progress: UploadProgress) => void
) {
  if (assets.length === 0) {
    return [];
  }

  let completed = 0;
  const total = assets.length;
  const uploadedPaths: string[] = [];

  try {
    const urls = await Promise.all(
      assets.map(async (asset, index) => {
        const blob = await fetchAssetBlob(asset);
        const storagePath = buildStoragePath(userId, asset, index);
        const { error } = await client.storage.from(STORAGE_BUCKET).upload(storagePath, blob, {
          contentType: asset.mimeType ?? (asset.type === "video" ? "video/mp4" : "image/jpeg"),
          upsert: false
        });

        if (error) {
          throw error;
        }

        uploadedPaths.push(storagePath);
        completed += 1;
        onProgress?.({
          completed,
          total,
          percent: Math.round((completed / total) * 100)
        });

        const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
        return data.publicUrl;
      })
    );

    return urls;
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await client.storage.from(STORAGE_BUCKET).remove(uploadedPaths);
    }
    throw error;
  }
}

async function createChapterIfNeeded(
  client: SupabaseClient,
  userId: string,
  input: CreateMemoryPinInput
) {
  if (input.chapterId) {
    const { data, error } = await client
      .from("chapters")
      .select("id,title,color")
      .eq("id", input.chapterId)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("Selected chapter could not be found.");
    }

    return {
      id: data.id,
      title: data.title,
      color: chapterColor(data.color)
    } satisfies ChapterOption;
  }

  const newChapterTitle = input.newChapterTitle?.trim();
  if (!newChapterTitle) {
    return null;
  }

  const { data, error } = await client
    .from("chapters")
    .insert({
      user_id: userId,
      title: newChapterTitle,
      color: DEFAULT_CHAPTER_COLOR,
      description: null
    })
    .select("id,title,color")
    .limit(1)
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    title: data.title,
    color: chapterColor(data.color)
  } satisfies ChapterOption;
}

export function buildOptimisticMemoryPin(
  input: CreateMemoryPinInput,
  temporaryId: string,
  chapter: ChapterOption | null
): MemoryPinMapItem {
  const mediaUrls = input.mediaAssets.map((asset) => asset.uri);

  return {
    id: temporaryId,
    userId: "local-user",
    title: input.title.trim(),
    body: input.body.trim() || undefined,
    mediaUrls,
    chapterId: chapter?.id,
    visibility: input.visibility,
    pinnedAt: input.pinnedAt,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    location: input.location,
    chapter,
    thumbnailUrl: mediaUrls[0]
  };
}

export function updateMemoryPinQueriesOptimistically(
  queryClient: QueryClientLike,
  pin: MemoryPinMapItem
) {
  const cacheEntries = queryClient.getQueriesData<MemoryPinMapItem[]>({
    queryKey: ["memory-pins", "bounds"]
  });

  for (const [queryKey, cachedPins] of cacheEntries) {
    const nextPins = [pin, ...(cachedPins ?? []).filter((existingPin) => existingPin.id !== pin.id)];
    queryClient.setQueryData(queryKey, nextPins);
  }
}

export function removeOptimisticMemoryPinFromQueries(
  queryClient: QueryClientLike,
  pinId: string
) {
  const cacheEntries = queryClient.getQueriesData<MemoryPinMapItem[]>({
    queryKey: ["memory-pins", "bounds"]
  });

  for (const [queryKey, cachedPins] of cacheEntries) {
    queryClient.setQueryData(
      queryKey,
      (cachedPins ?? []).filter((pin) => pin.id !== pinId)
    );
  }
}

export function replaceOptimisticMemoryPinInQueries(
  queryClient: QueryClientLike,
  temporaryId: string,
  pin: MemoryPinMapItem
) {
  const cacheEntries = queryClient.getQueriesData<MemoryPinMapItem[]>({
    queryKey: ["memory-pins", "bounds"]
  });

  for (const [queryKey, cachedPins] of cacheEntries) {
    const withoutTemporary = (cachedPins ?? []).filter((item) => item.id !== temporaryId);
    queryClient.setQueryData(queryKey, [pin, ...withoutTemporary]);
  }
}

export async function fetchUserChapters() {
  const client = getSupabaseClient();
  const userId = await getCurrentUserId(client);
  const { data, error } = await client
    .from("chapters")
    .select("id,title,color")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return (data ?? []).map(
    (chapter) =>
      ({
        id: chapter.id,
        title: chapter.title,
        color: chapterColor(chapter.color)
      }) satisfies ChapterOption
  );
}

export function useUserChapters(enabled = true) {
  return useQuery({
    queryKey: ["chapters", "mine"],
    queryFn: async () => fetchUserChapters(),
    enabled
  });
}

export async function createMemoryPin(
  input: CreateMemoryPinInput,
  options?: {
    onUploadProgress?: (progress: UploadProgress) => void;
  }
): Promise<CreateMemoryPinResult> {
  const client = getSupabaseClient();
  const userId = await getCurrentUserId(client);
  const chapter = await createChapterIfNeeded(client, userId, input);
  const mediaUrls = await uploadMediaAssets(client, userId, input.mediaAssets, options?.onUploadProgress);

  const { data, error } = await client
    .from("memory_pins")
    .insert({
      user_id: userId,
      title: input.title.trim(),
      body: input.body.trim() || null,
      media_urls: mediaUrls,
      chapter_id: chapter?.id ?? null,
      visibility: input.visibility,
      pinned_at: input.pinnedAt,
      location: `SRID=4326;POINT(${input.location.longitude} ${input.location.latitude})`
    })
    .select(
      "id,user_id,title,body,media_urls,chapter_id,visibility,pinned_at,created_at,updated_at,location,chapters(id,title,color)"
    )
    .limit(1)
    .single();

  if (error) {
    throw error;
  }

  const pin = mapPinRow(data as unknown as InsertMemoryPinRow);
  return { pin };
}

export function useCreateMemoryPin() {
  return useMutation({
    mutationFn: async (input: CreateMemoryPinInput) => createMemoryPin(input)
  });
}

export function boundsContainCoordinates(bounds: Bounds | null, coordinates: Coordinates) {
  if (!bounds) {
    return false;
  }

  return (
    coordinates.latitude <= bounds.northEast.latitude &&
    coordinates.latitude >= bounds.southWest.latitude &&
    coordinates.longitude <= bounds.northEast.longitude &&
    coordinates.longitude >= bounds.southWest.longitude
  );
}
