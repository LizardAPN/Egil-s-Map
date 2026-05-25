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
  avatarUrl?: string;
  bio?: string;
  homeBase?: Coordinates;
  createdAt: string;
}

export interface MemoryPin {
  id: string;
  userId: string;
  location: Coordinates;
  title: string;
  body?: string;
  mediaUrls: string[];
  chapterId?: string;
  visibility: Visibility;
  pinnedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  userId: string;
  title: string;
  description?: string;
  color: string;
  coverUrl?: string;
  startedAt?: string;
  endedAt?: string;
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
