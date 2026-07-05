import { getSupabaseClient } from "./supabase/runtime";
import type { Coordinates, MemoryPin } from "@imprint/types";

export interface EchoPin extends MemoryPin {
  author: {
    id: string;
    username: string;
    avatarUrl?: string | undefined;
  };
  distanceMeters: number;
}

export interface EchoNotificationCandidate extends EchoPin {
  debounceKey: string;
  timeAgoLabel: string;
}

interface EchoPinRow {
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
  location?: unknown;
  username?: unknown;
  avatar_url?: unknown;
  profile?: {
    username?: unknown;
    avatar_url?: unknown;
  } | null;
  user?: {
    username?: unknown;
    avatar_url?: unknown;
  } | null;
}

interface MutualFollowRow {
  follower_id?: unknown;
  following_id?: unknown;
}

const ECHO_RADIUS_METERS = 300;
const FIVE_YEARS_MS = 1000 * 60 * 60 * 24 * 365 * 5;

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function parseLocation(location: unknown): Coordinates | null {
  if (typeof location === "string") {
    const wktMatch = location.match(/POINT\((-?\d+(\.\d+)?) (-?\d+(\.\d+)?)\)/);
    if (wktMatch) {
      return {
        latitude: Number(wktMatch[3]),
        longitude: Number(wktMatch[1])
      };
    }

    try {
      const parsed = JSON.parse(location) as unknown;
      return parseLocation(parsed);
    } catch {
      return null;
    }
  }

  if (typeof location === "object" && location !== null) {
    const candidate = location as {
      latitude?: unknown;
      longitude?: unknown;
      coordinates?: unknown;
    };

    if (typeof candidate.latitude === "number" && typeof candidate.longitude === "number") {
      return {
        latitude: candidate.latitude,
        longitude: candidate.longitude
      };
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
      };
    }
  }

  return null;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineDistance(from: Coordinates, to: Coordinates) {
  const earthRadius = 6_371_000;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function withinLastFiveYears(dateString: string) {
  return Date.now() - new Date(dateString).getTime() <= FIVE_YEARS_MS;
}

function formatTimeAgo(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const day = 1000 * 60 * 60 * 24;
  const month = day * 30;
  const year = day * 365;

  if (diffMs >= year) {
    const years = Math.max(1, Math.floor(diffMs / year));
    return `${years} year${years === 1 ? "" : "s"} ago`;
  }

  if (diffMs >= month) {
    const months = Math.max(1, Math.floor(diffMs / month));
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }

  const days = Math.max(1, Math.floor(diffMs / day));
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function dayBucketIso(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getEchoLocationBuckets(coordinates: Coordinates) {
  return {
    latitudeBucket: Math.round(coordinates.latitude * 1000),
    longitudeBucket: Math.round(coordinates.longitude * 1000)
  };
}

export function createEchoDebounceKey(pinId: string, coordinates: Coordinates, date = new Date()) {
  const { latitudeBucket, longitudeBucket } = getEchoLocationBuckets(coordinates);
  return `${pinId}:${latitudeBucket}:${longitudeBucket}:${dayBucketIso(date)}`;
}

export async function wasEchoRecentlyTriggered(
  userId: string,
  pinId: string,
  coordinates: Coordinates,
  date = new Date()
) {
  const supabase = getSupabaseClient();
  const { latitudeBucket, longitudeBucket } = getEchoLocationBuckets(coordinates);
  const { data, error } = await supabase
    .from("echo_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("pin_id", pinId)
    .eq("latitude_bucket", latitudeBucket)
    .eq("longitude_bucket", longitudeBucket)
    .eq("triggered_on", dayBucketIso(date))
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return Boolean(data);
}

export async function logEchoTriggered(
  userId: string,
  pinId: string,
  coordinates: Coordinates,
  date = new Date()
) {
  const supabase = getSupabaseClient();
  const { latitudeBucket, longitudeBucket } = getEchoLocationBuckets(coordinates);
  const { error } = await supabase.from("echo_logs").upsert(
    {
      user_id: userId,
      pin_id: pinId,
      latitude_bucket: latitudeBucket,
      longitude_bucket: longitudeBucket,
      triggered_on: dayBucketIso(date)
    },
    {
      onConflict: "user_id,pin_id,latitude_bucket,longitude_bucket,triggered_on",
      ignoreDuplicates: true
    }
  );

  if (error) {
    throw error;
  }
}

function createEchoPin(row: EchoPinRow, currentLocation: Coordinates): EchoPin | null {
  const id = asString(row.id);
  const userId = asString(row.user_id);
  const title = asString(row.title);
  const pinnedAt = asString(row.pinned_at);
  const createdAt = asString(row.created_at);
  const updatedAt = asString(row.updated_at);
  const location = parseLocation(row.location);

  if (!id || !userId || !title || !pinnedAt || !createdAt || !updatedAt || !location) {
    return null;
  }

  return {
    id,
    userId,
    title,
    body: asString(row.body) ?? undefined,
    mediaUrls: asStringArray(row.media_urls),
    chapterId: asString(row.chapter_id) ?? undefined,
    visibility: (asString(row.visibility) ?? "friends") as MemoryPin["visibility"],
    pinnedAt,
    createdAt,
    updatedAt,
    location,
    author: {
      id: userId,
      username:
        asString(row.username) ??
        asString(row.profile?.username) ??
        asString(row.user?.username) ??
        "friend",
      avatarUrl:
        asString(row.avatar_url) ??
        asString(row.profile?.avatar_url) ??
        asString(row.user?.avatar_url) ??
        undefined
    },
    distanceMeters: haversineDistance(currentLocation, location)
  };
}

export async function getMutualFriendIds(userId: string) {
  const supabase = getSupabaseClient();

  try {
    const [followersResult, followingResult] = await Promise.all([
      supabase.from("follows").select("follower_id").eq("following_id", userId),
      supabase.from("follows").select("following_id").eq("follower_id", userId)
    ]);

    if (followersResult.error || followingResult.error) {
      return [];
    }

    const followerIds = new Set(
      (followersResult.data ?? [])
        .map((row) =>
          typeof (row as MutualFollowRow).follower_id === "string"
            ? (row as MutualFollowRow).follower_id
            : null
        )
        .filter((value): value is string => value !== null)
    );

    return (followingResult.data ?? [])
      .map((row) =>
        typeof (row as MutualFollowRow).following_id === "string"
          ? (row as MutualFollowRow).following_id
          : null
      )
      .filter((value): value is string => value !== null)
      .filter((value) => followerIds.has(value));
  } catch {
    return [];
  }
}

async function fetchPinsViaRpc(currentLocation: Coordinates, friendIds: string[]) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("find_nearby_friend_echoes", {
    latitude: currentLocation.latitude,
    longitude: currentLocation.longitude,
    friend_ids: friendIds,
    radius_meters: ECHO_RADIUS_METERS
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as EchoPinRow[];
}

async function fetchPinsViaUsersJoin(friendIds: string[]) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("memory_pins")
    .select(
      "id,user_id,title,body,media_urls,chapter_id,visibility,pinned_at,created_at,updated_at,location,user:users(username,avatar_url)"
    )
    .in("user_id", friendIds)
    .in("visibility", ["friends", "public"])
    .gte("pinned_at", new Date(Date.now() - FIVE_YEARS_MS).toISOString())
    .order("pinned_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return (data ?? []) as EchoPinRow[];
}

async function fetchPinsViaProfilesJoin(friendIds: string[]) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("memory_pins")
    .select(
      "id,user_id,title,body,media_urls,chapter_id,visibility,pinned_at,created_at,updated_at,location,profile:users!memory_pins_user_id_fkey(username,avatar_url)"
    )
    .in("user_id", friendIds)
    .in("visibility", ["friends", "public"])
    .gte("pinned_at", new Date(Date.now() - FIVE_YEARS_MS).toISOString())
    .order("pinned_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return (data ?? []) as EchoPinRow[];
}

export async function findNearbyFriendEchoPins(
  currentLocation: Coordinates,
  friendIds: string[],
  seenDebounceKeys: string[] = []
) {
  if (friendIds.length === 0) {
    return [] satisfies EchoNotificationCandidate[];
  }

  const seenKeys = new Set(seenDebounceKeys);
  const strategies = [
    async () => fetchPinsViaRpc(currentLocation, friendIds),
    async () => fetchPinsViaUsersJoin(friendIds),
    async () => fetchPinsViaProfilesJoin(friendIds)
  ] as const;

  for (const strategy of strategies) {
    try {
      const rows = await strategy();
      return rows
        .map((row) => createEchoPin(row, currentLocation))
        .filter((pin): pin is EchoPin => pin !== null)
        .filter((pin) => pin.distanceMeters <= ECHO_RADIUS_METERS)
        .filter((pin) => withinLastFiveYears(pin.pinnedAt))
        .map((pin) => ({
          ...pin,
          debounceKey: createEchoDebounceKey(pin.id, pin.location),
          timeAgoLabel: formatTimeAgo(pin.pinnedAt)
        }))
        .filter((pin) => !seenKeys.has(pin.debounceKey))
        .slice(0, 1);
    } catch {
      continue;
    }
  }

  return [] satisfies EchoNotificationCandidate[];
}

export async function getEchoPinById(pinId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("memory_pins")
    .select(
      "id,user_id,title,body,media_urls,chapter_id,visibility,pinned_at,created_at,updated_at,location,profile:users!memory_pins_user_id_fkey(username,avatar_url)"
    )
    .eq("id", pinId)
    .in("visibility", ["friends", "public"])
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const pin = createEchoPin(data as EchoPinRow, {
    latitude: 0,
    longitude: 0
  });

  return pin;
}
