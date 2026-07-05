import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@imprint/types";

import { ApiError, toApiError } from "./errors";
import { mapUserRow, type UserProfile } from "./mappers";

type ProfileClient = SupabaseClient<Database>;

const PROFILE_COLUMNS =
  "id, username, display_name, bio, avatar_url, is_onboarded, created_at" as const;

export interface ProfilePatch {
  username?: string;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  isOnboarded?: boolean;
}

export async function getMyProfile(
  client: ProfileClient,
): Promise<UserProfile | null> {
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError) {
    throw toApiError(authError);
  }

  if (!user) {
    return null;
  }

  const { data, error } = await client
    .from("users")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw toApiError(error);
  }

  if (!data) {
    return null;
  }

  return mapUserRow(data);
}

export async function updateMyProfile(
  client: ProfileClient,
  patch: ProfilePatch,
): Promise<UserProfile> {
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

  const update: Database["public"]["Tables"]["users"]["Update"] = {};

  if (patch.username !== undefined) update.username = patch.username;
  if (patch.displayName !== undefined) update.display_name = patch.displayName;
  if (patch.bio !== undefined) update.bio = patch.bio;
  if (patch.avatarUrl !== undefined) update.avatar_url = patch.avatarUrl;
  if (patch.isOnboarded !== undefined) update.is_onboarded = patch.isOnboarded;

  const { data, error } = await client
    .from("users")
    .update(update)
    .eq("id", user.id)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    throw toApiError(error);
  }

  return mapUserRow(data);
}

export interface UsernameAvailabilityOptions {
  excludeUserId?: string;
}

export async function isUsernameAvailable(
  client: ProfileClient,
  username: string,
  options?: UsernameAvailabilityOptions,
): Promise<boolean> {
  const { data, error } = await client
    .from("users")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

  if (error) {
    throw toApiError(error);
  }

  if (data === null) {
    return true;
  }

  if (options?.excludeUserId && data.id === options.excludeUserId) {
    return true;
  }

  return false;
}
