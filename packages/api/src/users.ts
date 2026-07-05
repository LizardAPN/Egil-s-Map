import { useMutation, useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "./supabase/runtime";
import type {
  PresenceVisibility,
  User,
  UserSettings,
  Visibility
} from "@imprint/types";

export interface ProfileFormInput {
  displayName: string;
  username: string;
  bio: string;
  website: string;
  avatarAsset?: {
    uri: string;
    fileName?: string | undefined;
    mimeType?: string | undefined;
  } | null;
}

export interface AccountUser extends User, UserSettings {
  email?: string | undefined;
}

export interface FollowListUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | undefined;
  bio?: string | undefined;
  relationship: "self" | "friend" | "following" | "follower" | "none";
}

interface UserRow {
  id?: unknown;
  username?: unknown;
  display_name?: unknown;
  avatar_url?: unknown;
  bio?: unknown;
  website?: unknown;
  is_onboarded?: unknown;
  echoes_enabled?: unknown;
  notifications_enabled?: unknown;
  default_live_visibility?: unknown;
  default_pin_visibility?: unknown;
  created_at?: unknown;
}

interface FollowRow {
  follower_id?: unknown;
  following_id?: unknown;
}

const AVATAR_BUCKET =
  process.env.EXPO_PUBLIC_SUPABASE_AVATAR_BUCKET ??
  process.env.EXPO_PUBLIC_SUPABASE_CHAPTER_COVERS_BUCKET ??
  "chapter-covers";
const USERNAME_REGEX = /^[a-z0-9._]{3,24}$/;

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asPresenceVisibility(value: unknown): PresenceVisibility {
  return value === "community" || value === "hidden" ? value : "friends";
}

function asVisibility(value: unknown): Visibility {
  return value === "friends" || value === "public" ? value : "private";
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function validateProfileInput(input: ProfileFormInput) {
  const displayName = input.displayName.trim();
  const username = normalizeUsername(input.username);
  const bio = input.bio.trim();
  const website = input.website.trim();

  if (!displayName) {
    throw new Error("Display name is required.");
  }

  if (!USERNAME_REGEX.test(username)) {
    throw new Error("Username must be 3-24 characters using lowercase letters, numbers, dots, or underscores.");
  }

  if (bio.length > 160) {
    throw new Error("Bio must be 160 characters or less.");
  }

  if (website && !/^https?:\/\//.test(website)) {
    throw new Error("Website must start with http:// or https://");
  }

  return {
    displayName,
    username,
    bio,
    website
  };
}

function createAccountUser(row: UserRow, email?: string) {
  const id = asString(row.id);
  const username = asString(row.username);
  const createdAt = asString(row.created_at);

  if (!id || !username || !createdAt) {
    throw new Error("User profile is incomplete.");
  }

  return {
    id,
    username,
    displayName: asString(row.display_name) ?? username,
    avatarUrl: asString(row.avatar_url) ?? undefined,
    bio: asString(row.bio) ?? undefined,
    website: asString(row.website) ?? undefined,
    isOnboarded: asBoolean(row.is_onboarded, false),
    echoesEnabled: asBoolean(row.echoes_enabled, true),
    notificationsEnabled: asBoolean(row.notifications_enabled, true),
    defaultLiveVisibility: asPresenceVisibility(row.default_live_visibility),
    defaultPinVisibility: asVisibility(row.default_pin_visibility),
    email,
    createdAt
  } satisfies AccountUser;
}

async function getCurrentUserId() {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user?.id) {
    throw new Error("You must be signed in.");
  }

  return {
    id: data.user.id,
    email: data.user.email
  };
}

async function uploadAvatar(userId: string, asset: NonNullable<ProfileFormInput["avatarAsset"]>) {
  const client = getSupabaseClient();
  const response = await fetch(asset.uri);

  if (!response.ok) {
    throw new Error(`Could not read avatar image: ${response.status}`);
  }

  const blob = await response.blob();
  const extension =
    asset.fileName?.split(".").pop() ??
    asset.mimeType?.split("/")[1] ??
    "jpg";
  const fileName = sanitizeFileName(asset.fileName ?? `avatar.${extension}`);
  const path = `${userId}/${Date.now()}-${fileName}`;
  const { error } = await client.storage.from(AVATAR_BUCKET).upload(path, blob, {
    contentType: asset.mimeType ?? "image/jpeg",
    upsert: true
  });

  if (error) {
    throw error;
  }

  const { data } = client.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function getCurrentUserAccount() {
  const client = getSupabaseClient();
  const { id, email } = await getCurrentUserId();
  const { data, error } = await client
    .from("users")
    .select(
      "id,username,display_name,avatar_url,bio,website,is_onboarded,echoes_enabled,notifications_enabled,default_live_visibility,default_pin_visibility,created_at"
    )
    .eq("id", id)
    .limit(1)
    .single();

  if (error) {
    throw error;
  }

  return createAccountUser(data as UserRow, email);
}

export async function setOnboardingState(isOnboarded: boolean) {
  const client = getSupabaseClient();
  const { id, email } = await getCurrentUserId();
  const { data, error } = await client
    .from("users")
    .update({
      is_onboarded: isOnboarded
    })
    .eq("id", id)
    .select(
      "id,username,display_name,avatar_url,bio,website,is_onboarded,echoes_enabled,notifications_enabled,default_live_visibility,default_pin_visibility,created_at"
    )
    .limit(1)
    .single();

  if (error) {
    throw new Error(
      typeof error.message === "string" ? error.message : "Couldn't update onboarding state."
    );
  }

  return createAccountUser(data as UserRow, email);
}

export async function updateUserSettings(input: Partial<UserSettings>) {
  const client = getSupabaseClient();
  const { id, email } = await getCurrentUserId();
  const updates: Record<string, boolean | PresenceVisibility | Visibility> = {};

  if (input.echoesEnabled !== undefined) {
    updates.echoes_enabled = input.echoesEnabled;
  }

  if (input.notificationsEnabled !== undefined) {
    updates.notifications_enabled = input.notificationsEnabled;
  }

  if (input.defaultLiveVisibility !== undefined) {
    updates.default_live_visibility = input.defaultLiveVisibility;
  }

  if (input.defaultPinVisibility !== undefined) {
    updates.default_pin_visibility = input.defaultPinVisibility;
  }

  const { data, error } = await client
    .from("users")
    .update(updates)
    .eq("id", id)
    .select(
      "id,username,display_name,avatar_url,bio,website,is_onboarded,echoes_enabled,notifications_enabled,default_live_visibility,default_pin_visibility,created_at"
    )
    .limit(1)
    .single();

  if (error) {
    throw error;
  }

  return createAccountUser(data as UserRow, email);
}

export async function isUsernameAvailable(username: string, currentUserId?: string) {
  const normalizedUsername = normalizeUsername(username);
  if (!USERNAME_REGEX.test(normalizedUsername)) {
    return false;
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from("users")
    .select("id")
    .eq("username", normalizedUsername)
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  if (!data) {
    return true;
  }

  return asString((data as { id?: unknown }).id) === currentUserId;
}

export async function updateProfile(input: ProfileFormInput) {
  const client = getSupabaseClient();
  const { id, email } = await getCurrentUserId();
  const normalized = validateProfileInput(input);
  const usernameAvailable = await isUsernameAvailable(normalized.username, id);

  if (!usernameAvailable) {
    throw new Error("That username is already taken.");
  }

  const avatarUrl = input.avatarAsset ? await uploadAvatar(id, input.avatarAsset) : undefined;
  const { data, error } = await client
    .from("users")
    .update({
      display_name: normalized.displayName,
      username: normalized.username,
      bio: normalized.bio || null,
      website: normalized.website || null,
      avatar_url: avatarUrl
    })
    .eq("id", id)
    .select(
      "id,username,display_name,avatar_url,bio,website,is_onboarded,echoes_enabled,notifications_enabled,default_live_visibility,default_pin_visibility,created_at"
    )
    .limit(1)
    .single();

  if (error) {
    throw error;
  }

  await client.auth.updateUser({
    data: {
      username: normalized.username,
      full_name: normalized.displayName,
      avatar_url: avatarUrl,
      bio: normalized.bio,
      website: normalized.website
    }
  });

  return createAccountUser(data as UserRow, email);
}

export async function changeEmail(email: string) {
  const client = getSupabaseClient();
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  const { error } = await client.auth.updateUser({
    email: normalizedEmail
  });

  if (error) {
    throw error;
  }
}

export async function changePassword(password: string) {
  const client = getSupabaseClient();

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const { error } = await client.auth.updateUser({
    password
  });

  if (error) {
    throw error;
  }
}

export async function deleteAccount() {
  const client = getSupabaseClient();
  const { error } = await client.rpc("delete_my_account");

  if (error) {
    throw error;
  }
}

async function getViewerFollowSets(viewerId: string, userIds: string[]) {
  const client = getSupabaseClient();
  const [followingResult, followerResult] = await Promise.all([
    client
      .from("follows")
      .select("following_id")
      .eq("follower_id", viewerId)
      .in("following_id", userIds),
    client
      .from("follows")
      .select("follower_id")
      .eq("following_id", viewerId)
      .in("follower_id", userIds)
  ]);

  if (followingResult.error) {
    throw followingResult.error;
  }

  if (followerResult.error) {
    throw followerResult.error;
  }

  return {
    following: new Set(
      (followingResult.data ?? [])
        .map((row) => asString((row as FollowRow).following_id))
        .filter((id): id is string => id !== null)
    ),
    followers: new Set(
      (followerResult.data ?? [])
        .map((row) => asString((row as FollowRow).follower_id))
        .filter((id): id is string => id !== null)
    )
  };
}

function getRelationship(
  userId: string,
  viewerId: string | null,
  followingIds: Set<string>,
  followerIds: Set<string>
): FollowListUser["relationship"] {
  if (!viewerId) {
    return "none";
  }

  if (userId === viewerId) {
    return "self";
  }

  const isFollowing = followingIds.has(userId);
  const isFollower = followerIds.has(userId);

  if (isFollowing && isFollower) {
    return "friend";
  }

  if (isFollowing) {
    return "following";
  }

  if (isFollower) {
    return "follower";
  }

  return "none";
}

async function getUserListByIds(userIds: string[], viewerId: string | null) {
  if (userIds.length === 0) {
    return [] satisfies FollowListUser[];
  }

  const client = getSupabaseClient();
  const [{ data, error }, viewerFollowSets] = await Promise.all([
    client.from("users").select("id,username,display_name,avatar_url,bio").in("id", userIds),
    viewerId
      ? getViewerFollowSets(viewerId, userIds)
      : Promise.resolve({
          following: new Set<string>(),
          followers: new Set<string>()
        })
  ]);

  if (error) {
    throw error;
  }

  const byId = new Map<string, FollowListUser>();

  for (const row of data ?? []) {
    const candidate = row as UserRow;
    const id = asString(candidate.id);
    const username = asString(candidate.username);

    if (!id || !username) {
      continue;
    }

    byId.set(id, {
      id,
      username,
      displayName: asString(candidate.display_name) ?? username,
      avatarUrl: asString(candidate.avatar_url) ?? undefined,
      bio: asString(candidate.bio) ?? undefined,
      relationship: getRelationship(
        id,
        viewerId,
        viewerFollowSets.following,
        viewerFollowSets.followers
      )
    });
  }

  return userIds
    .map((userId) => byId.get(userId) ?? null)
    .filter((item): item is FollowListUser => item !== null);
}

export async function getFollowers(userId: string) {
  const client = getSupabaseClient();
  const [{ data, error }, authResult] = await Promise.all([
    client.from("follows").select("follower_id").eq("following_id", userId),
    client.auth.getUser()
  ]);

  if (error) {
    throw error;
  }

  if (authResult.error) {
    throw authResult.error;
  }

  const ids = (data ?? [])
    .map((row) => asString((row as FollowRow).follower_id))
    .filter((id): id is string => id !== null);

  return getUserListByIds(ids, authResult.data.user?.id ?? null);
}

export async function getFollowing(userId: string) {
  const client = getSupabaseClient();
  const [{ data, error }, authResult] = await Promise.all([
    client.from("follows").select("following_id").eq("follower_id", userId),
    client.auth.getUser()
  ]);

  if (error) {
    throw error;
  }

  if (authResult.error) {
    throw authResult.error;
  }

  const ids = (data ?? [])
    .map((row) => asString((row as FollowRow).following_id))
    .filter((id): id is string => id !== null);

  return getUserListByIds(ids, authResult.data.user?.id ?? null);
}

export function useCurrentUserAccount(enabled = true) {
  return useQuery({
    queryKey: ["account", "me"],
    queryFn: async () => getCurrentUserAccount(),
    enabled
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: updateProfile
  });
}

export function useUpdateUserSettings() {
  return useMutation({
    mutationFn: updateUserSettings
  });
}

export function useChangeEmail() {
  return useMutation({
    mutationFn: changeEmail
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: changePassword
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: deleteAccount
  });
}

export function useFollowers(userId: string, enabled = true) {
  return useQuery({
    queryKey: ["followers", userId],
    queryFn: async () => getFollowers(userId),
    enabled: enabled && userId.length > 0
  });
}

export function useFollowing(userId: string, enabled = true) {
  return useQuery({
    queryKey: ["following", userId],
    queryFn: async () => getFollowing(userId),
    enabled: enabled && userId.length > 0
  });
}
