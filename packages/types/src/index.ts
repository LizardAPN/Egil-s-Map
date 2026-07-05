import type { Database } from "./database.js";

export type { Database };

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Visibility = "private" | "friends" | "unlisted" | "public";

/** Geographic bounding box: [west, south, east, north] in degrees */
export type Bbox = readonly [
  west: number,
  south: number,
  east: number,
  north: number,
];

export const PKG = "types";
