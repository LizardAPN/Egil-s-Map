export type Visibility = "private" | "friends" | "public";
export type PresenceVisibility = "friends" | "community" | "hidden";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | undefined;
  bio?: string | undefined;
  homeBase?: Coordinates | undefined;
  createdAt: string;
}

export interface MemoryPin {
  id: string;
  userId: string;
  location: Coordinates;
  title: string;
  body?: string | undefined;
  mediaUrls: string[];
  chapterId?: string | undefined;
  visibility: Visibility;
  pinnedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  userId: string;
  title: string;
  description?: string | undefined;
  color: string;
  coverUrl?: string | undefined;
  startedAt?: string | undefined;
  endedAt?: string | undefined;
  pinIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LivePresence {
  userId: string;
  location: Coordinates;
  visibility: PresenceVisibility;
  updatedAt: string;
  expiresAt: string;
}
