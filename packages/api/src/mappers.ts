import type { Chapter, Tables, Visibility } from "@imprint/types";

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

export type ChapterRow = Pick<
  Tables<"chapters">,
  | "id"
  | "user_id"
  | "slug"
  | "title"
  | "description"
  | "color"
  | "cover_url"
  | "started_at"
  | "ended_at"
  | "visibility"
  | "position"
  | "created_at"
  | "updated_at"
>;

export function mapChapterRow(row: ChapterRow): Chapter {
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    color: row.color,
    coverUrl: row.cover_url,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    visibility: row.visibility as Visibility,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
