import type { Tables } from "@imprint/types";

export interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isOnboarded: boolean;
  createdAt: string;
}

export type UserProfileRow = Pick<
  Tables<"users">,
  | "id"
  | "username"
  | "display_name"
  | "bio"
  | "avatar_url"
  | "is_onboarded"
  | "created_at"
>;

export function mapUserRow(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    isOnboarded: row.is_onboarded,
    createdAt: row.created_at,
  };
}
