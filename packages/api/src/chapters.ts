import { useMutation, useQuery } from "@tanstack/react-query";
import type { Chapter, Coordinates, MemoryPin, User } from "@imprint/types";
import { getSupabaseClient } from "./supabase/runtime";

export interface ChapterSummary extends Chapter {
  pinCount: number;
}

export interface ChapterPin extends MemoryPin {
  locationName?: string | undefined;
  thumbnailUrl?: string | undefined;
}

export interface ProfileGridPin extends ChapterPin {
  chapterColor?: string | undefined;
}

export interface ChapterWithPins extends ChapterSummary {
  pins: ChapterPin[];
}

export interface CreateChapterData {
  title: string;
  description?: string | undefined;
  color: string;
  startedAt?: string | undefined;
  endedAt?: string | undefined;
  coverUrl?: string | undefined;
}

export interface UpdateChapterData {
  title?: string | undefined;
  description?: string | undefined;
  color?: string | undefined;
  startedAt?: string | null;
  endedAt?: string | null;
  coverUrl?: string | null;
}

export interface UserProfile extends User {
  chapterCount: number;
}

export interface UserProfileStats {
  memories: number;
  chapters: number;
  followers: number;
  following: number;
}

export interface UserProfilePageData {
  profile: UserProfile;
  stats: UserProfileStats;
  chapters: ChapterSummary[];
  pins: ProfileGridPin[];
  isOwnProfile: boolean;
  isFollowing: boolean;
}

export interface CoverCandidate {
  id: string;
  title: string;
  imageUrl: string;
}

export interface CoverUploadAsset {
  uri: string;
  fileName?: string | undefined;
  mimeType?: string | undefined;
}

interface ChapterRow {
  id?: unknown;
  user_id?: unknown;
  title?: unknown;
  description?: unknown;
  color?: unknown;
  cover_url?: unknown;
  started_at?: unknown;
  ended_at?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  pin_count?: unknown;
  memory_pins?: Array<{ id?: unknown }> | null;
}

interface PinRow {
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
}

interface ProfileRow {
  id?: unknown;
  username?: unknown;
  display_name?: unknown;
  avatar_url?: unknown;
  bio?: unknown;
  created_at?: unknown;
}

const CHAPTER_COVERS_BUCKET =
  process.env.EXPO_PUBLIC_SUPABASE_CHAPTER_COVERS_BUCKET ?? "chapter-covers";
const DEFAULT_CHAPTER_COLOR = "#38bdf8";

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asIsoString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : new Date().toISOString();
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

function createChapterFromRow(row: ChapterRow): ChapterSummary | null {
  const id = asString(row.id);
  const userId = asString(row.user_id);
  const title = asString(row.title);

  if (!id || !userId || !title) {
    return null;
  }

  const nestedPinCount = Array.isArray(row.memory_pins) ? row.memory_pins.length : 0;

  return {
    id,
    userId,
    title,
    description: asString(row.description) ?? undefined,
    color: asString(row.color) ?? DEFAULT_CHAPTER_COLOR,
    coverUrl: asString(row.cover_url) ?? undefined,
    startedAt: asString(row.started_at) ?? undefined,
    endedAt: asString(row.ended_at) ?? undefined,
    pinIds: [],
    createdAt: asIsoString(row.created_at),
    updatedAt: asIsoString(row.updated_at),
    pinCount: typeof row.pin_count === "number" ? row.pin_count : nestedPinCount
  };
}

function createPinFromRow(row: PinRow): ChapterPin | null {
  const id = asString(row.id);
  const userId = asString(row.user_id);
  const title = asString(row.title);
  const location = parseLocation(row.location);

  if (!id || !userId || !title || !location) {
    return null;
  }

  const mediaUrls = asStringArray(row.media_urls);

  return {
    id,
    userId,
    title,
    body: asString(row.body) ?? undefined,
    mediaUrls,
    chapterId: asString(row.chapter_id) ?? undefined,
    visibility: (asString(row.visibility) ?? "private") as MemoryPin["visibility"],
    pinnedAt: asIsoString(row.pinned_at),
    createdAt: asIsoString(row.created_at),
    updatedAt: asIsoString(row.updated_at),
    location,
    thumbnailUrl: mediaUrls[0]
  };
}

function createProfileGridPin(row: PinRow): ProfileGridPin | null {
  const pin = createPinFromRow(row);
  if (!pin) {
    return null;
  }

  return {
    ...pin
  };
}

async function getCurrentUserId() {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user?.id) {
    throw new Error("You must be signed in to access chapters.");
  }

  return data.user.id;
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

async function uploadChapterCover(userId: string, asset: CoverUploadAsset) {
  const client = getSupabaseClient();
  const response = await fetch(asset.uri);

  if (!response.ok) {
    throw new Error(`Could not read cover photo: ${response.status}`);
  }

  const blob = await response.blob();
  const extension =
    asset.fileName?.split(".").pop() ??
    asset.mimeType?.split("/")[1] ??
    "jpg";
  const fileName = sanitizeFileName(asset.fileName ?? `chapter-cover.${extension}`);
  const path = `${userId}/${Date.now()}-${fileName}`;
  const { error } = await client.storage.from(CHAPTER_COVERS_BUCKET).upload(path, blob, {
    contentType: asset.mimeType ?? "image/jpeg",
    upsert: false
  });

  if (error) {
    throw error;
  }

  const { data } = client.storage.from(CHAPTER_COVERS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function getUserChapters(userId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("chapters")
    .select(
      "id,user_id,title,description,color,cover_url,started_at,ended_at,created_at,updated_at,memory_pins(id)"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => createChapterFromRow(row as ChapterRow))
    .filter((chapter): chapter is ChapterSummary => chapter !== null);
}

export async function getPublicUserChapters(userId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("chapters")
    .select(
      "id,user_id,title,description,color,cover_url,started_at,ended_at,created_at,updated_at,memory_pins(id)"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => createChapterFromRow(row as ChapterRow))
    .filter((chapter): chapter is ChapterSummary => chapter !== null);
}

async function getRawProfileRowByUsername(username: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("users")
    .select("id,username,display_name,avatar_url,bio,created_at")
    .eq("username", username)
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return (data as ProfileRow | null) ?? null;
}

async function getFollowCounts(userId: string) {
  const client = getSupabaseClient();
  const [{ data: followers, error: followersError }, { data: following, error: followingError }] =
    await Promise.all([
      client.from("follows").select("follower_id").eq("following_id", userId),
      client.from("follows").select("following_id").eq("follower_id", userId)
    ]);

  if (followersError) {
    throw followersError;
  }

  if (followingError) {
    throw followingError;
  }

  return {
    followers: (followers ?? []).length,
    following: (following ?? []).length
  };
}

async function getPinnedMemoriesForProfile(userId: string, isOwnProfile: boolean) {
  const client = getSupabaseClient();
  let query = client
    .from("memory_pins")
    .select(
      "id,user_id,title,body,media_urls,chapter_id,visibility,pinned_at,created_at,updated_at,location"
    )
    .eq("user_id", userId)
    .order("pinned_at", { ascending: false })
    .limit(120);

  if (!isOwnProfile) {
    query = query.eq("visibility", "public");
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => createProfileGridPin(row as PinRow))
    .filter((pin): pin is ProfileGridPin => pin !== null);
}

async function getMemoryCountForProfile(userId: string, isOwnProfile: boolean) {
  const client = getSupabaseClient();
  let query = client
    .from("memory_pins")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (!isOwnProfile) {
    query = query.eq("visibility", "public");
  }

  const { count, error } = await query;
  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function getFollowState(viewerId: string | null, profileUserId: string) {
  if (!viewerId || viewerId === profileUserId) {
    return {
      isOwnProfile: viewerId === profileUserId,
      isFollowing: false
    };
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from("follows")
    .select("follower_id")
    .eq("follower_id", viewerId)
    .eq("following_id", profileUserId)
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return {
    isOwnProfile: false,
    isFollowing: data !== null
  };
}

export async function getChapterWithPins(chapterId: string) {
  const client = getSupabaseClient();
  const { data: chapterData, error: chapterError } = await client
    .from("chapters")
    .select(
      "id,user_id,title,description,color,cover_url,started_at,ended_at,created_at,updated_at,memory_pins(id)"
    )
    .eq("id", chapterId)
    .limit(1)
    .single();

  if (chapterError) {
    throw chapterError;
  }

  const chapter = createChapterFromRow(chapterData as ChapterRow);
  if (!chapter) {
    throw new Error("Chapter not found.");
  }

  const { data: pinData, error: pinError } = await client
    .from("memory_pins")
    .select("id,user_id,title,body,media_urls,chapter_id,visibility,pinned_at,created_at,updated_at,location")
    .eq("chapter_id", chapterId)
    .order("pinned_at", { ascending: true });

  if (pinError) {
    throw pinError;
  }

  const pins = (pinData ?? [])
    .map((row) => createPinFromRow(row as PinRow))
    .filter((pin): pin is ChapterPin => pin !== null);

  return {
    ...chapter,
    pinIds: pins.map((pin) => pin.id),
    pinCount: pins.length,
    pins
  } satisfies ChapterWithPins;
}

export async function createChapter(data: CreateChapterData) {
  const client = getSupabaseClient();
  const userId = await getCurrentUserId();

  const { data: inserted, error } = await client
    .from("chapters")
    .insert({
      user_id: userId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      color: data.color,
      cover_url: data.coverUrl ?? null,
      started_at: data.startedAt ?? null,
      ended_at: data.endedAt ?? null
    })
    .select("id,user_id,title,description,color,cover_url,started_at,ended_at,created_at,updated_at")
    .limit(1)
    .single();

  if (error) {
    throw error;
  }

  const chapter = createChapterFromRow(inserted as ChapterRow);
  if (!chapter) {
    throw new Error("Created chapter payload was invalid.");
  }

  return chapter;
}

export async function updateChapter(id: string, data: UpdateChapterData) {
  const client = getSupabaseClient();
  const { data: updated, error } = await client
    .from("chapters")
    .update({
      title: data.title?.trim(),
      description:
        data.description === undefined ? undefined : data.description.trim() || null,
      color: data.color,
      cover_url: data.coverUrl === undefined ? undefined : data.coverUrl,
      started_at: data.startedAt === undefined ? undefined : data.startedAt,
      ended_at: data.endedAt === undefined ? undefined : data.endedAt
    })
    .eq("id", id)
    .select("id,user_id,title,description,color,cover_url,started_at,ended_at,created_at,updated_at")
    .limit(1)
    .single();

  if (error) {
    throw error;
  }

  const chapter = createChapterFromRow(updated as ChapterRow);
  if (!chapter) {
    throw new Error("Updated chapter payload was invalid.");
  }

  return chapter;
}

export async function deleteChapter(id: string) {
  const client = getSupabaseClient();
  const { error } = await client.from("chapters").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

export async function getCurrentUserProfile() {
  const client = getSupabaseClient();
  const userId = await getCurrentUserId();

  const [{ data: authData, error: authError }, { data: profileData, error: profileError }, chapters] =
    await Promise.all([
      client.auth.getUser(),
      client
        .from("users")
        .select("id,username,display_name,avatar_url,bio,created_at")
        .eq("id", userId)
        .limit(1)
        .maybeSingle(),
      getUserChapters(userId)
    ]);

  if (authError) {
    throw authError;
  }

  if (profileError && profileError.code !== "PGRST116") {
    throw profileError;
  }

  const user = authData.user;
  if (!user) {
    throw new Error("Signed-in user not found.");
  }

  const row = profileData as ProfileRow | null;
  const username = asString(row?.username) ?? user.email?.split("@")[0] ?? "imprint";
  const displayName =
    asString(row?.display_name) ??
    user.user_metadata.full_name ??
    user.user_metadata.name ??
    username;

  return {
    id: user.id,
    username,
    displayName,
    avatarUrl: asString(row?.avatar_url) ?? (user.user_metadata.avatar_url as string | undefined),
    bio: asString(row?.bio) ?? undefined,
    createdAt: asIsoString(asString(row?.created_at) ?? user.created_at),
    chapterCount: chapters.length
  } satisfies UserProfile;
}

export async function getUserProfile(userId: string) {
  const client = getSupabaseClient();
  const [{ data: authData }, { data: profileData, error: profileError }, chapters] =
    await Promise.all([
      client.auth.getUser(),
      client
        .from("users")
        .select("id,username,display_name,avatar_url,bio,created_at")
        .eq("id", userId)
        .limit(1)
        .maybeSingle(),
      getPublicUserChapters(userId)
    ]);

  if (profileError && profileError.code !== "PGRST116") {
    throw profileError;
  }

  const currentUser = authData.user;
  const row = profileData as ProfileRow | null;
  const username =
    asString(row?.username) ??
    (currentUser?.id === userId ? currentUser.email?.split("@")[0] : null) ??
    "imprint";
  const displayName =
    asString(row?.display_name) ??
    (currentUser?.id === userId
      ? ((currentUser.user_metadata.full_name as string | undefined) ??
        (currentUser.user_metadata.name as string | undefined))
      : null) ??
    username;

  return {
    id: userId,
    username,
    displayName,
    avatarUrl:
      asString(row?.avatar_url) ??
      (currentUser?.id === userId
        ? (currentUser.user_metadata.avatar_url as string | undefined)
        : undefined),
    bio: asString(row?.bio) ?? undefined,
    createdAt: asIsoString(asString(row?.created_at) ?? new Date().toISOString()),
    chapterCount: chapters.length
  } satisfies UserProfile;
}

export async function getUserProfileByUsername(username: string) {
  const client = getSupabaseClient();
  const [{ data: authData, error: authError }, profileRow] = await Promise.all([
    client.auth.getUser(),
    getRawProfileRowByUsername(username)
  ]);

  if (authError) {
    throw authError;
  }

  if (!profileRow) {
    throw new Error("Profile not found.");
  }

  const viewerId = authData.user?.id ?? null;
  const profileUserId = asString(profileRow.id);
  if (!profileUserId) {
    throw new Error("Profile is missing an id.");
  }

  const [{ followers, following }, followState, chapters, pins, memoryCount] = await Promise.all([
    getFollowCounts(profileUserId),
    getFollowState(viewerId, profileUserId),
    viewerId === profileUserId ? getUserChapters(profileUserId) : getPublicUserChapters(profileUserId),
    getPinnedMemoriesForProfile(profileUserId, viewerId === profileUserId),
    getMemoryCountForProfile(profileUserId, viewerId === profileUserId)
  ]);

  const profile = {
    id: profileUserId,
    username: asString(profileRow.username) ?? username,
    displayName: asString(profileRow.display_name) ?? username,
    avatarUrl: asString(profileRow.avatar_url) ?? undefined,
    bio: asString(profileRow.bio) ?? undefined,
    createdAt: asIsoString(profileRow.created_at),
    chapterCount: chapters.length
  } satisfies UserProfile;

  return {
    profile,
    stats: {
      memories: memoryCount,
      chapters: chapters.length,
      followers,
      following
    },
    chapters,
    pins,
    isOwnProfile: followState.isOwnProfile,
    isFollowing: followState.isFollowing
  } satisfies UserProfilePageData;
}

export async function getChapterCoverCandidates(limit = 24) {
  const client = getSupabaseClient();
  const userId = await getCurrentUserId();
  const { data, error } = await client
    .from("memory_pins")
    .select("id,title,media_urls")
    .eq("user_id", userId)
    .order("pinned_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => {
      const mediaUrls = asStringArray((row as { media_urls?: unknown }).media_urls);
      const imageUrl = mediaUrls.find((url) => !url.endsWith(".mp4") && !url.includes("video"));
      const id = asString((row as { id?: unknown }).id);
      const title = asString((row as { title?: unknown }).title);

      if (!id || !title || !imageUrl) {
        return null;
      }

      return {
        id,
        title,
        imageUrl
      } satisfies CoverCandidate;
    })
    .filter((candidate): candidate is CoverCandidate => candidate !== null);
}

export async function createChapterWithCover(
  data: CreateChapterData & { coverUpload?: CoverUploadAsset | null }
) {
  const userId = await getCurrentUserId();
  const coverUrl = data.coverUpload
    ? await uploadChapterCover(userId, data.coverUpload)
    : data.coverUrl;

  return createChapter({
    title: data.title,
    description: data.description,
    color: data.color,
    startedAt: data.startedAt,
    endedAt: data.endedAt,
    coverUrl
  });
}

export async function followUserById(targetUserId: string) {
  const client = getSupabaseClient();
  const viewerId = await getCurrentUserId();
  if (viewerId === targetUserId) {
    throw new Error("You cannot follow yourself.");
  }

  const { error } = await client
    .from("follows")
    .insert({
      follower_id: viewerId,
      following_id: targetUserId
    });

  if (error) {
    throw error;
  }
}

export async function unfollowUserById(targetUserId: string) {
  const client = getSupabaseClient();
  const viewerId = await getCurrentUserId();
  const { error } = await client
    .from("follows")
    .delete()
    .eq("follower_id", viewerId)
    .eq("following_id", targetUserId);

  if (error) {
    throw error;
  }
}

export function useCurrentUserProfile(enabled = true) {
  return useQuery({
    queryKey: ["profile", "me"],
    queryFn: async () => getCurrentUserProfile(),
    enabled
  });
}

export function useCurrentUserChapters(enabled = true) {
  return useQuery({
    queryKey: ["chapters", "me"],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      return getUserChapters(userId);
    },
    enabled
  });
}

export function useProfilePageByUsername(username: string, enabled = true) {
  return useQuery({
    queryKey: ["profile-page", username],
    queryFn: async () => getUserProfileByUsername(username),
    enabled: enabled && username.length > 0
  });
}

export function useUserProfile(userId: string, enabled = true) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => getUserProfile(userId),
    enabled: enabled && userId.length > 0
  });
}

export function useUserChapters(userId: string, enabled = true) {
  return useQuery({
    queryKey: ["chapters", userId],
    queryFn: async () => getPublicUserChapters(userId),
    enabled: enabled && userId.length > 0
  });
}

export function useChapterDetail(chapterId: string, enabled = true) {
  return useQuery({
    queryKey: ["chapter", chapterId],
    queryFn: async () => getChapterWithPins(chapterId),
    enabled: enabled && chapterId.length > 0
  });
}

export function useChapterCoverCandidates(enabled = true) {
  return useQuery({
    queryKey: ["chapters", "cover-candidates"],
    queryFn: async () => getChapterCoverCandidates(),
    enabled
  });
}

export function useFollowUser() {
  return useMutation({
    mutationFn: followUserById
  });
}

export function useUnfollowUser() {
  return useMutation({
    mutationFn: unfollowUserById
  });
}
