import AsyncStorage from "@react-native-async-storage/async-storage";
import Mapbox from "@rnmapbox/maps";
import { createSupabaseMobileClient } from "@imprint/api/mobile";
import type { Coordinates } from "@imprint/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  Pressable,
  Text,
  View
} from "react-native";

type SharingMode = "hidden" | "friends" | "community";

interface PresencePayload {
  userId: string;
  latitude: number;
  longitude: number;
  username: string;
  avatarUrl?: string;
  bio?: string;
  mode: Exclude<SharingMode, "hidden">;
  updatedAt: string;
}

interface LiveUser extends PresencePayload {
  key: string;
}

interface SelectedUserCard extends LiveUser {
  distanceMeters: number;
}

interface MutualFollowRow {
  follower_id?: unknown;
  following_id?: unknown;
}

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
const MAPBOX_DARK_STYLE = "mapbox://styles/mapbox/dark-v11";
const LIVE_SETTINGS_STORAGE_KEY = "imprint:live-sharing-mode";
const LIVE_CHANNEL = "presence";
const BROADCAST_TOPIC = "live-location";
const BROADCAST_INTERVAL_MS = 30_000;
const POSITION_THROTTLE_MS = 15_000;
const PRESENCE_TTL_MS = 90_000;
const MAX_COMMUNITY_MARKERS = 200;
const DEFAULT_CENTER: Coordinates = {
  latitude: 40.7128,
  longitude: -74.006
};

if (MAPBOX_TOKEN.length > 0) {
  Mapbox.setAccessToken(MAPBOX_TOKEN);
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineDistance(from: Coordinates, to: Coordinates) {
  const earthRadius = 6_371_000;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m away`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km away`;
}

function applyFuzzyOffset(coordinates: Coordinates): Coordinates {
  const maxOffsetMeters = 300;
  const bearing = Math.random() * Math.PI * 2;
  const radius = Math.random() * maxOffsetMeters;
  const latitudeOffset = (radius * Math.cos(bearing)) / 111_320;
  const longitudeOffset =
    (radius * Math.sin(bearing)) /
    (111_320 * Math.max(Math.cos(toRadians(coordinates.latitude)), 0.2));

  return {
    latitude: coordinates.latitude + latitudeOffset,
    longitude: coordinates.longitude + longitudeOffset
  };
}

function isPresencePayload(value: unknown): value is PresencePayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.userId === "string" &&
    typeof candidate.latitude === "number" &&
    typeof candidate.longitude === "number" &&
    typeof candidate.username === "string" &&
    (candidate.mode === "friends" || candidate.mode === "community")
  );
}

function normalizeLiveUser(payload: PresencePayload) {
  return {
    ...payload,
    key: payload.userId
  } satisfies LiveUser;
}

function communityGlowColor(count: number) {
  if (count > 40) {
    return "#f97316";
  }
  if (count > 18) {
    return "#eab308";
  }
  return "#38bdf8";
}

function pruneStaleUsers(users: LiveUser[]) {
  const now = Date.now();
  return users.filter(
    (user) => now - new Date(user.updatedAt).getTime() <= PRESENCE_TTL_MS
  );
}

async function getStoredSharingMode() {
  const storedMode = await AsyncStorage.getItem(LIVE_SETTINGS_STORAGE_KEY);
  if (storedMode === "friends" || storedMode === "community" || storedMode === "hidden") {
    return storedMode satisfies SharingMode;
  }

  return "hidden" satisfies SharingMode;
}

async function setStoredSharingMode(mode: SharingMode) {
  await AsyncStorage.setItem(LIVE_SETTINGS_STORAGE_KEY, mode);
}

async function getCurrentUserProfile() {
  const supabase = createSupabaseMobileClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  const user = data.user;
  if (!user) {
    throw new Error("You must be signed in to use Live Map.");
  }

  const username =
    (typeof user.user_metadata.username === "string" && user.user_metadata.username) ||
    (typeof user.user_metadata.user_name === "string" && user.user_metadata.user_name) ||
    user.email?.split("@")[0] ||
    "imprint";
  const avatarUrl =
    typeof user.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : undefined;
  const bio = typeof user.user_metadata.bio === "string" ? user.user_metadata.bio : undefined;

  return {
    userId: user.id,
    username,
    avatarUrl,
    bio
  };
}

async function getMutualFollowerIds(userId: string) {
  const supabase = createSupabaseMobileClient();

  try {
    const [followersResult, followingResult] = await Promise.all([
      supabase.from("follows").select("follower_id").eq("following_id", userId),
      supabase.from("follows").select("following_id").eq("follower_id", userId)
    ]);

    if (followersResult.error || followingResult.error) {
      return new Set<string>();
    }

    const followerIds = new Set(
      (followersResult.data ?? [])
        .map((row) => (typeof (row as MutualFollowRow).follower_id === "string" ? (row as MutualFollowRow).follower_id : null))
        .filter((value): value is string => value !== null)
    );

    return new Set(
      (followingResult.data ?? [])
        .map((row) =>
          typeof (row as MutualFollowRow).following_id === "string"
            ? (row as MutualFollowRow).following_id
            : null
        )
        .filter((value): value is string => value !== null && followerIds.has(value))
    );
  } catch {
    return new Set<string>();
  }
}

async function getFreshPosition() {
  const lastKnown = await Location.getLastKnownPositionAsync();
  if (lastKnown) {
    return {
      latitude: lastKnown.coords.latitude,
      longitude: lastKnown.coords.longitude
    } satisfies Coordinates;
  }

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced
  });

  return {
    latitude: current.coords.latitude,
    longitude: current.coords.longitude
  } satisfies Coordinates;
}

export default function LiveMapScreen() {
  const supabase = useMemo(() => {
    try {
      return createSupabaseMobileClient();
    } catch {
      return null;
    }
  }, []);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const broadcastTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBroadcastAtRef = useRef<number>(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [sharingMode, setSharingMode] = useState<SharingMode>("hidden");
  const [isFocused, setIsFocused] = useState(false);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === "active");
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);
  const [myCoordinates, setMyCoordinates] = useState<Coordinates | null>(null);
  const [myProfile, setMyProfile] = useState<{
    userId: string;
    username: string;
    avatarUrl?: string;
    bio?: string;
  } | null>(null);
  const [friendUsers, setFriendUsers] = useState<LiveUser[]>([]);
  const [communityUsers, setCommunityUsers] = useState<LiveUser[]>([]);
  const [mutualFollowerIds, setMutualFollowerIds] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<SelectedUserCard | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => {
        setIsFocused(false);
      };
    }, [])
  );

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        const [mode, permission, profile] = await Promise.all([
          getStoredSharingMode(),
          Location.requestForegroundPermissionsAsync(),
          supabase ? getCurrentUserProfile() : Promise.resolve(null)
        ]);

        if (!isMounted) {
          return;
        }

        setSharingMode(mode);
        setHasLocationPermission(permission.granted);
        setMyProfile(profile);

        if (profile) {
          const mutuals = await getMutualFollowerIds(profile.userId);
          if (isMounted) {
            setMutualFollowerIds(mutuals);
          }
        }

        if (permission.granted) {
          const coordinates = await getFreshPosition();
          if (isMounted) {
            setMyCoordinates(coordinates);
          }
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Live Map could not initialize."
          );
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
      setIsAppActive(nextState === "active");
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const isBroadcastEnabled =
    sharingMode !== "hidden" &&
    isFocused &&
    isAppActive &&
    hasLocationPermission === true &&
    supabase !== null &&
    myProfile !== null;

  const publishPresence = useCallback(async () => {
    if (!supabase || !myProfile || sharingMode === "hidden" || appStateRef.current !== "active") {
      return;
    }

    const now = Date.now();
    if (now - lastBroadcastAtRef.current < POSITION_THROTTLE_MS) {
      return;
    }

    try {
      const coordinates = await getFreshPosition();
      setMyCoordinates(coordinates);
      const fuzzyCoordinates = applyFuzzyOffset(coordinates);
      const payload: PresencePayload = {
        userId: myProfile.userId,
        username: myProfile.username,
        avatarUrl: myProfile.avatarUrl,
        bio: myProfile.bio,
        latitude: fuzzyCoordinates.latitude,
        longitude: fuzzyCoordinates.longitude,
        mode: sharingMode,
        updatedAt: new Date().toISOString()
      };

      await channelRef.current?.send({
        type: "broadcast",
        event: BROADCAST_TOPIC,
        payload
      });

      lastBroadcastAtRef.current = now;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Couldn’t update your live location."
      );
    }
  }, [myProfile, sharingMode, supabase]);

  useEffect(() => {
    if (!supabase || !myProfile) {
      return;
    }

    const channel = supabase.channel(LIVE_CHANNEL, {
      config: {
        broadcast: {
          self: false
        }
      }
    });

    channel
      .on("broadcast", { event: BROADCAST_TOPIC }, ({ payload }) => {
        if (!isPresencePayload(payload) || payload.userId === myProfile.userId) {
          return;
        }

        const nextUser = normalizeLiveUser(payload);

        if (payload.mode === "friends") {
          if (!mutualFollowerIds.has(payload.userId)) {
            return;
          }

          setFriendUsers((currentUsers) => {
            const deduped = new Map(currentUsers.map((user) => [user.userId, user]));
            deduped.set(nextUser.userId, nextUser);
            return pruneStaleUsers(Array.from(deduped.values())).slice(0, MAX_COMMUNITY_MARKERS);
          });
          return;
        }

        setCommunityUsers((currentUsers) => {
          const deduped = new Map(currentUsers.map((user) => [user.userId, user]));
          deduped.set(nextUser.userId, nextUser);
          return pruneStaleUsers(Array.from(deduped.values()))
            .sort(
              (left, right) =>
                new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
            )
            .slice(0, MAX_COMMUNITY_MARKERS);
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && isBroadcastEnabled) {
          await publishPresence();
        }
      });

    channelRef.current = channel;

    return () => {
      if (broadcastTimerRef.current) {
        clearInterval(broadcastTimerRef.current);
        broadcastTimerRef.current = null;
      }

      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [isBroadcastEnabled, mutualFollowerIds, myProfile, publishPresence, supabase]);

  useEffect(() => {
    if (!isBroadcastEnabled) {
      if (broadcastTimerRef.current) {
        clearInterval(broadcastTimerRef.current);
        broadcastTimerRef.current = null;
      }
      return;
    }

    void publishPresence();

    broadcastTimerRef.current = setInterval(() => {
      void publishPresence();
    }, BROADCAST_INTERVAL_MS);

    return () => {
      if (broadcastTimerRef.current) {
        clearInterval(broadcastTimerRef.current);
        broadcastTimerRef.current = null;
      }
    };
  }, [isBroadcastEnabled, publishPresence]);

  useEffect(() => {
    const pruneInterval = setInterval(() => {
      setFriendUsers((currentUsers) => pruneStaleUsers(currentUsers));
      setCommunityUsers((currentUsers) => pruneStaleUsers(currentUsers));
    }, 15_000);

    return () => {
      clearInterval(pruneInterval);
    };
  }, []);

  const friendFeatures = useMemo(
    () =>
      ({
        type: "FeatureCollection",
        features: friendUsers.map((user) => ({
          type: "Feature",
          id: user.userId,
          properties: {
            id: user.userId,
            username: user.username
          },
          geometry: {
            type: "Point",
            coordinates: [user.longitude, user.latitude]
          }
        }))
      }) as const,
    [friendUsers]
  );

  const communityFeatures = useMemo(
    () =>
      ({
        type: "FeatureCollection",
        features: communityUsers.map((user) => ({
          type: "Feature",
          id: user.userId,
          properties: {
            id: user.userId,
            updatedAt: user.updatedAt
          },
          geometry: {
            type: "Point",
            coordinates: [user.longitude, user.latitude]
          }
        }))
      }) as const,
    [communityUsers]
  );

  const mapCenter = myCoordinates ?? DEFAULT_CENTER;
  const communityGlow = communityGlowColor(communityUsers.length);

  const handleToggleSharing = async () => {
    const nextMode: SharingMode = sharingMode === "hidden" ? "friends" : "hidden";
    setSharingMode(nextMode);
    await setStoredSharingMode(nextMode);
    setSelectedUser(null);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleFriendMarkerPress = (user: LiveUser) => {
    if (!myCoordinates) {
      return;
    }

    setSelectedUser({
      ...user,
      distanceMeters: haversineDistance(myCoordinates, {
        latitude: user.latitude,
        longitude: user.longitude
      })
    });
  };

  const renderFriendMarkers = friendUsers.slice(0, 40).map((user) => (
    <Mapbox.MarkerView
      coordinate={[user.longitude, user.latitude]}
      id={`friend-${user.userId}`}
      key={user.userId}
    >
      <Pressable
        accessibilityRole="button"
        className="items-center"
        onPress={() => {
          handleFriendMarkerPress(user);
        }}
      >
        <View className="h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-stone-900 shadow-lg">
          {user.avatarUrl ? (
            <Image
              contentFit="cover"
              source={{ uri: user.avatarUrl }}
              style={{ width: 48, height: 48, borderRadius: 999 }}
            />
          ) : (
            <View className="h-12 w-12 items-center justify-center rounded-full bg-sky-400">
              <Text className="text-lg font-semibold text-stone-950">
                {user.username.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Mapbox.MarkerView>
  ));

  return (
    <View className="flex-1 bg-stone-950">
      {MAPBOX_TOKEN ? (
        <Mapbox.MapView
          attributionEnabled={false}
          className="flex-1"
          compassEnabled
          logoEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          scaleBarEnabled={false}
          styleURL={MAPBOX_DARK_STYLE}
        >
          <Mapbox.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: [mapCenter.longitude, mapCenter.latitude],
              zoomLevel: 10.5
            }}
          />
          <Mapbox.LocationPuck visible />

          <Mapbox.ShapeSource
            cluster
            clusterMaxZoomLevel={11}
            clusterRadius={50}
            id="community-source"
            shape={communityFeatures}
          >
            <Mapbox.HeatmapLayer
              id="community-heatmap"
              style={{
                heatmapColor: [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0,
                  "rgba(14,165,233,0)",
                  0.25,
                  "rgba(14,165,233,0.35)",
                  0.6,
                  "rgba(234,179,8,0.65)",
                  1,
                  "rgba(249,115,22,0.95)"
                ],
                heatmapIntensity: 0.8,
                heatmapRadius: 24,
                heatmapOpacity: 0.8
              }}
            />
            <Mapbox.CircleLayer
              filter={["!", ["has", "point_count"]]}
              id="community-dots"
              style={{
                circleColor: communityGlow,
                circleOpacity: 0.85,
                circleRadius: 4,
                circleBlur: 0.6
              }}
            />
            <Mapbox.CircleLayer
              filter={["has", "point_count"]}
              id="community-clusters"
              style={{
                circleColor: "#0f172a",
                circleOpacity: 0.9,
                circleRadius: [
                  "step",
                  ["get", "point_count"],
                  16,
                  10,
                  20,
                  25,
                  26
                ],
                circleStrokeColor: communityGlow,
                circleStrokeWidth: 2
              }}
            />
            <Mapbox.SymbolLayer
              filter={["has", "point_count"]}
              id="community-cluster-count"
              style={{
                textColor: "#f8fafc",
                textField: ["get", "point_count"],
                textSize: 12
              }}
            />
          </Mapbox.ShapeSource>

          {renderFriendMarkers}
        </Mapbox.MapView>
      ) : (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-lg font-semibold text-white">
            Mapbox token missing
          </Text>
          <Text className="mt-3 text-center text-sm text-stone-300">
            Set `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` to render the Live Map.
          </Text>
        </View>
      )}

      <View className="absolute left-4 right-4 top-14 gap-2">
        {isBroadcastEnabled ? (
          <View className="self-start rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2">
            <Text className="text-xs font-medium text-emerald-100">
              You are sharing your location
            </Text>
          </View>
        ) : null}

        {sharingMode === "hidden" ? (
          <View className="self-start rounded-full border border-white/10 bg-stone-950/85 px-4 py-2">
            <Text className="text-xs font-medium text-stone-200">
              Live sharing is off. Hidden is the default.
            </Text>
          </View>
        ) : null}

        {hasLocationPermission === false ? (
          <View className="self-start rounded-full border border-amber-400/30 bg-amber-500/15 px-4 py-2">
            <Text className="text-xs font-medium text-amber-100">
              Location permission is required to broadcast.
            </Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View className="self-start rounded-full border border-rose-400/30 bg-rose-500/15 px-4 py-2">
            <Text className="text-xs font-medium text-rose-100">{errorMessage}</Text>
          </View>
        ) : null}
      </View>

      <View className="absolute bottom-6 left-4 right-4 flex-row items-end justify-between">
        <View className="max-w-[68%] rounded-[28px] border border-white/10 bg-stone-950/92 px-4 py-4">
          <Text className="text-xs uppercase tracking-[1.6px] text-stone-500">Live mode</Text>
          <Text className="mt-2 text-lg font-semibold text-white">
            {sharingMode === "hidden"
              ? "Hidden"
              : sharingMode === "friends"
                ? "Friends-only"
                : "Community"}
          </Text>
          <Text className="mt-2 text-sm leading-6 text-stone-300">
            Friends use fuzzy coordinates. Community broadcasts become heat and dots.
          </Text>
        </View>

        <View className="gap-3">
          <Pressable
            accessibilityRole="button"
            className={`rounded-full px-5 py-4 ${
              sharingMode === "hidden" ? "bg-sky-400" : "bg-stone-900"
            }`}
            onPress={() => {
              void handleToggleSharing();
            }}
          >
            <Text
              className={`text-sm font-semibold ${
                sharingMode === "hidden" ? "text-stone-950" : "text-white"
              }`}
            >
              {sharingMode === "hidden" ? "Enable sharing" : "Disable sharing"}
            </Text>
          </Pressable>

          <View className="rounded-full border border-white/10 bg-stone-950/92 p-1">
            {(["friends", "community"] satisfies Array<Exclude<SharingMode, "hidden">>).map(
              (mode) => (
                <Pressable
                  accessibilityRole="button"
                  className={`rounded-full px-4 py-3 ${
                    sharingMode === mode ? "bg-white/10" : ""
                  }`}
                  key={mode}
                  onPress={async () => {
                    setSharingMode(mode);
                    await setStoredSharingMode(mode);
                    await Haptics.selectionAsync();
                  }}
                >
                  <Text className="text-xs font-medium uppercase tracking-[1.4px] text-stone-200">
                    {mode}
                  </Text>
                </Pressable>
              )
            )}
          </View>
        </View>
      </View>

      {selectedUser ? (
        <View className="absolute inset-x-0 bottom-44 items-center px-5">
          <View className="w-full rounded-[28px] border border-white/10 bg-stone-950/95 px-5 py-4">
            <View className="flex-row items-center gap-4">
              {selectedUser.avatarUrl ? (
                <Image
                  contentFit="cover"
                  source={{ uri: selectedUser.avatarUrl }}
                  style={{ width: 56, height: 56, borderRadius: 999 }}
                />
              ) : (
                <View className="h-14 w-14 items-center justify-center rounded-full bg-sky-400">
                  <Text className="text-xl font-semibold text-stone-950">
                    {selectedUser.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View className="flex-1">
                <Text className="text-lg font-semibold text-white">{selectedUser.username}</Text>
                <Text className="mt-1 text-sm text-stone-400">
                  {formatDistance(selectedUser.distanceMeters)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                className="rounded-full border border-white/10 px-3 py-2"
                onPress={() => {
                  setSelectedUser(null);
                }}
              >
                <Text className="text-xs font-medium uppercase tracking-[1.6px] text-stone-300">
                  Close
                </Text>
              </Pressable>
            </View>
            <Text className="mt-4 text-sm leading-6 text-stone-300">
              {selectedUser.bio ?? "Exploring with Imprint right now."}
            </Text>
          </View>
        </View>
      ) : null}

      {isInitializing ? (
        <View className="absolute inset-0 items-center justify-center bg-stone-950/55">
          <ActivityIndicator color="#38bdf8" />
        </View>
      ) : null}
    </View>
  );
}
