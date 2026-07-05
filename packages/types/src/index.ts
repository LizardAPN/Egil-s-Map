import type { Database } from "./database.js";

export type { Database };

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Visibility = "private" | "friends" | "unlisted" | "public";

export const PKG = "types";
