import type { Chapter, Coordinates, MemoryPin } from "@imprint/types";

export const DEFAULT_CHAPTER_COLOR = "#38bdf8";

export interface Bounds {
  northEast: Coordinates;
  southWest: Coordinates;
}

export interface MemoryPinMapItem extends MemoryPin {
  chapter: Pick<Chapter, "id" | "title" | "color"> | null;
  thumbnailUrl?: string | undefined;
}

export interface RawMemoryPinRow {
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

export interface RawPinDetailRow extends RawMemoryPinRow {
  chapters?: {
    id?: unknown;
    title?: unknown;
    color?: unknown;
  } | null;
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

export function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

export function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function asIsoString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : new Date().toISOString();
}

export function parseLocationFromUnknown(location: unknown): Coordinates | null {
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

export function createMemoryPinFromRow(row: RawMemoryPinRow): MemoryPinMapItem | null {
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

export function isInBounds(pin: MemoryPinMapItem, bounds: Bounds) {
  const latitude = pin.location.latitude;
  const longitude = pin.location.longitude;

  return (
    latitude <= bounds.northEast.latitude &&
    latitude >= bounds.southWest.latitude &&
    longitude <= bounds.northEast.longitude &&
    longitude >= bounds.southWest.longitude
  );
}
