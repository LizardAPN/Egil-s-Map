import type {
  Bbox,
  Chapter,
  Database,
  Pin,
  PinListItem,
  Tables,
  Visibility,
} from "@imprint/types";

export type PinListRow = Database["public"]["Functions"]["pins_in_bounds"]["Returns"][number];
export type PinDetailRow = Database["public"]["Functions"]["pin_by_id"]["Returns"][number];

export function mapPinRow(row: PinListRow): PinListItem {
  return {
    id: row.id,
    userId: row.user_id,
    chapterId: row.chapter_id || null,
    location: { lng: row.lng, lat: row.lat },
    locationExact: row.location_exact,
    locationName: row.location_name,
    title: row.title,
    visibility: row.visibility as Visibility,
    pinnedAt: row.pinned_at,
  };
}

export function mapPinDetailRow(row: PinDetailRow): Pin {
  return {
    ...mapPinRow(row),
    body: row.body,
  };
}

export function locationToWkt(location: { lng: number; lat: number }): string {
  return `POINT(${String(location.lng)} ${String(location.lat)})`;
}

export function bboxToRpcArgs(bbox: Bbox): {
  min_lng: number;
  min_lat: number;
  max_lng: number;
  max_lat: number;
} {
  const [west, south, east, north] = bbox;
  return {
    min_lng: west,
    min_lat: south,
    max_lng: east,
    max_lat: north,
  };
}

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
