import { getSupabaseClient } from "./supabase/runtime";
import type { Coordinates } from "@imprint/types";

export type DiscoverTimeFilter = "recent" | "all-time";

export interface DiscoverQueryParams {
  center: Coordinates;
  radiusMeters: number;
  timeFilter: DiscoverTimeFilter;
  withPhotos: boolean;
  limit?: number;
}

export interface DiscoverPin {
  id: string;
  title: string;
  body?: string | undefined;
  mediaUrls: string[];
  pinnedAt: string;
  location: Coordinates;
  author: {
    id: string;
    username: string;
    avatarUrl?: string | undefined;
    bio?: string | undefined;
  };
  chapter?: {
    id?: string | undefined;
    title: string;
    color: string;
  } | undefined;
  reactionCount: number;
}

interface DiscoverRow {
  id?: unknown;
  title?: unknown;
  body?: unknown;
  media_urls?: unknown;
  pinned_at?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  location?: unknown;
  user_id?: unknown;
  username?: unknown;
  avatar_url?: unknown;
  bio?: unknown;
  chapter_id?: unknown;
  chapter_title?: unknown;
  chapter_color?: unknown;
  reactions_count?: unknown;
  user?: {
    id?: unknown;
    username?: unknown;
    avatar_url?: unknown;
    bio?: unknown;
  } | null;
  profile?: {
    id?: unknown;
    username?: unknown;
    avatar_url?: unknown;
    bio?: unknown;
  } | null;
  chapter?: {
    id?: unknown;
    title?: unknown;
    color?: unknown;
  } | null;
}

const DEFAULT_CHAPTER_COLOR = "#f97316";
const RECENT_WINDOW_DAYS = 30;

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function parseLocation(row: DiscoverRow) {
  if (typeof row.latitude === "number" && typeof row.longitude === "number") {
    return {
      latitude: row.latitude,
      longitude: row.longitude
    } satisfies Coordinates;
  }

  if (typeof row.location === "string") {
    const wktMatch = row.location.match(/POINT\((-?\d+(\.\d+)?) (-?\d+(\.\d+)?)\)/);
    if (wktMatch) {
      return {
        latitude: Number(wktMatch[3]),
        longitude: Number(wktMatch[1])
      } satisfies Coordinates;
    }

    try {
      const parsed = JSON.parse(row.location) as unknown;
      if (typeof parsed === "object" && parsed !== null) {
        const candidate = parsed as { coordinates?: unknown };
        if (
          Array.isArray(candidate.coordinates) &&
          candidate.coordinates.length >= 2 &&
          typeof candidate.coordinates[0] === "number" &&
          typeof candidate.coordinates[1] === "number"
        ) {
          return {
            latitude: candidate.coordinates[1],
            longitude: candidate.coordinates[0]
          } satisfies Coordinates;
        }
      }
    } catch {
      return null;
    }
  }

  if (typeof row.location === "object" && row.location !== null) {
    const candidate = row.location as {
      latitude?: unknown;
      longitude?: unknown;
      coordinates?: unknown;
    };

    if (typeof candidate.latitude === "number" && typeof candidate.longitude === "number") {
      return {
        latitude: candidate.latitude,
        longitude: candidate.longitude
      } satisfies Coordinates;
    }

    if (
      Array.isArray(candidate.coordinates) &&
      candidate.coordinates.length >= 2 &&
      typeof candidate.coordinates[0] === "number" &&
      typeof candidate.coordinates[1] === "number"
    ) {
      return {
        latitude: candidate.coordinates[1],
        longitude: candidate.coordinates[0]
      } satisfies Coordinates;
    }
  }

  return null;
}

function createDiscoverPin(row: DiscoverRow): DiscoverPin | null {
  const id = asString(row.id);
  const title = asString(row.title);
  const pinnedAt = asString(row.pinned_at);
  const location = parseLocation(row);
  const mediaUrls = asStringArray(row.media_urls);
  const authorId =
    asString(row.user_id) ?? asString(row.user?.id) ?? asString(row.profile?.id) ?? null;
  const username =
    asString(row.username) ??
    asString(row.user?.username) ??
    asString(row.profile?.username) ??
    null;

  if (!id || !title || !pinnedAt || !location || !authorId || !username) {
    return null;
  }

  const chapterTitle =
    asString(row.chapter_title) ?? asString(row.chapter?.title) ?? null;
  const chapterColor =
    asString(row.chapter_color) ?? asString(row.chapter?.color) ?? DEFAULT_CHAPTER_COLOR;
  const chapterId = asString(row.chapter_id) ?? asString(row.chapter?.id) ?? undefined;

  return {
    id,
    title,
    body: asString(row.body) ?? undefined,
    mediaUrls,
    pinnedAt,
    location,
    author: {
      id: authorId,
      username,
      avatarUrl:
        asString(row.avatar_url) ??
        asString(row.user?.avatar_url) ??
        asString(row.profile?.avatar_url) ??
        undefined,
      bio:
        asString(row.bio) ??
        asString(row.user?.bio) ??
        asString(row.profile?.bio) ??
        undefined
    },
    chapter: chapterTitle
      ? {
          id: chapterId,
          title: chapterTitle,
          color: chapterColor
        }
      : undefined,
    reactionCount: typeof row.reactions_count === "number" ? row.reactions_count : 0
  };
}

function isWithinRadius(center: Coordinates, point: Coordinates, radiusMeters: number) {
  const earthRadius = 6_371_000;
  const dLat = ((point.latitude - center.latitude) * Math.PI) / 180;
  const dLon = ((point.longitude - center.longitude) * Math.PI) / 180;
  const lat1 = (center.latitude * Math.PI) / 180;
  const lat2 = (point.latitude * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c <= radiusMeters;
}

function recentCutoffIso() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RECENT_WINDOW_DAYS);
  return cutoff.toISOString();
}

async function fetchViaExactRpc(params: DiscoverQueryParams) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("discover_public_memory_pins", {
    longitude: params.center.longitude,
    latitude: params.center.latitude,
    radius_meters: params.radiusMeters,
    time_filter: params.timeFilter,
    with_photos: params.withPhotos,
    page_limit: params.limit ?? 30
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as DiscoverRow[];
}

async function fetchViaUsersJoin(params: DiscoverQueryParams) {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("memory_pins")
    .select(
      "id,user_id,title,body,media_urls,pinned_at,location,user:users(id,username,avatar_url,bio),chapter:chapters(id,title,color)"
    )
    .eq("visibility", "public")
    .order("pinned_at", { ascending: false })
    .limit(params.limit ?? 30);

  if (params.timeFilter === "recent") {
    query = query.gte("pinned_at", recentCutoffIso());
  }

  if (params.withPhotos) {
    query = query.not("media_urls", "is", null);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as DiscoverRow[];
}

async function fetchViaProfilesJoin(params: DiscoverQueryParams) {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("memory_pins")
    .select(
      "id,user_id,title,body,media_urls,pinned_at,location,profile:users!memory_pins_user_id_fkey(id,username,avatar_url,bio),chapter:chapters(id,title,color)"
    )
    .eq("visibility", "public")
    .order("pinned_at", { ascending: false })
    .limit(params.limit ?? 30);

  if (params.timeFilter === "recent") {
    query = query.gte("pinned_at", recentCutoffIso());
  }

  if (params.withPhotos) {
    query = query.not("media_urls", "is", null);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as DiscoverRow[];
}

export async function fetchPublicDiscoverPins(params: DiscoverQueryParams) {
  const normalizedLimit = params.limit ?? 30;
  const normalizedParams = {
    ...params,
    limit: normalizedLimit
  } satisfies DiscoverQueryParams;

  const strategies = [fetchViaExactRpc, fetchViaUsersJoin, fetchViaProfilesJoin] as const;

  for (const strategy of strategies) {
    try {
      const rows = await strategy(normalizedParams);
      return rows
        .map((row) => createDiscoverPin(row))
        .filter((pin): pin is DiscoverPin => pin !== null)
        .filter((pin) => isWithinRadius(normalizedParams.center, pin.location, normalizedParams.radiusMeters))
        .filter((pin) => (normalizedParams.withPhotos ? pin.mediaUrls.length > 0 : true))
        .slice(0, normalizedLimit);
    } catch {
      continue;
    }
  }

  throw new Error("Could not fetch discover pins from Supabase.");
}
