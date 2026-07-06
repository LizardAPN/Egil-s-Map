import type { Database } from "./database.js";

export type { Database };

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Visibility = "private" | "friends" | "unlisted" | "public";

export interface PinLocation {
  lng: number;
  lat: number;
}

export interface Chapter {
  id: string;
  userId: string;
  slug: string;
  title: string;
  description: string | null;
  color: string;
  coverUrl: string | null;
  startedAt: string | null;
  endedAt: string | null;
  visibility: Visibility;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChapterInput {
  title: string;
  color: string;
  startedAt?: string | null;
  endedAt?: string | null;
}

export interface CreatePinInput {
  chapterId?: string | null;
  location: PinLocation;
  locationName?: string | null;
  title: string;
  body?: string | null;
  visibility?: Visibility;
  pinnedAt?: string;
}

export interface PinListItem {
  id: string;
  userId: string;
  chapterId: string | null;
  location: PinLocation;
  locationExact: boolean;
  locationName: string | null;
  title: string;
  visibility: Visibility;
  pinnedAt: string;
}

export interface Pin extends PinListItem {
  body: string | null;
  chapterTitle?: string | null;
  chapterColor?: string | null;
}

export interface PinMedia {
  id: string;
  position: number;
  url: string;
  storagePath: string;
  width: number | null;
  height: number | null;
  blurhash: string | null;
  mediaType: "image" | "video";
}

export interface UpdatePinInput {
  title?: string;
  body?: string | null;
  locationName?: string | null;
  visibility?: Visibility;
  pinnedAt?: string;
  chapterId?: string | null;
  location?: PinLocation;
}

export interface UserPreferences {
  defaultPinVisibility: Visibility;
}

/** Geographic bounding box: [west, south, east, north] in degrees */
export type Bbox = readonly [
  west: number,
  south: number,
  east: number,
  north: number,
];

export const PKG = "types";
