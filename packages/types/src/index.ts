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

/** Geographic bounding box: [west, south, east, north] in degrees */
export type Bbox = readonly [
  west: number,
  south: number,
  east: number,
  north: number,
];

export const PKG = "types";
