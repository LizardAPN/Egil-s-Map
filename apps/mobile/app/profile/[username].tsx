import Mapbox from "@rnmapbox/maps";
import {
  useFollowUser,
  useProfilePageByUsername,
  useUnfollowUser,
  type ProfileGridPin
} from "@imprint/api/chapters";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
const HEADER_HERO_HEIGHT = 280;

if (MAPBOX_TOKEN.length > 0) {
  Mapbox.setAccessToken(MAPBOX_TOKEN);
}

function formatDateRange(startedAt?: string, endedAt?: string) {
  if (!startedAt && !endedAt) {
    return "Open timeline";
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric"
  });

  return `${startedAt ? formatter.format(new Date(startedAt)) : "Unknown"} - ${
    endedAt ? formatter.format(new Date(endedAt)) : "Now"
  }`;
}

function CoverCollage({
  imageUrls,
  fallbackColors
}: {
  imageUrls: string[];
  fallbackColors: string[];
}) {
  const first = imageUrls[0];
  const second = imageUrls[1];
  const third = imageUrls[2];
  const fourth = imageUrls[3];

  return (
    <View className="h-[280px] w-full overflow-hidden bg-stone-900">
      <View className="flex-1 flex-row">
        <View className="flex-1">
          {first ? (
            <Image contentFit="cover" source={{ uri: first }} style={{ width: "100%", height: "100%" }} />
          ) : (
            <View className="flex-1" style={{ backgroundColor: fallbackColors[0] ?? "#0f172a" }} />
          )}
        </View>
        <View className="flex-1">
          <View className="flex-1">
            {second ? (
              <Image contentFit="cover" source={{ uri: second }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <View className="flex-1" style={{ backgroundColor: fallbackColors[1] ?? "#1e293b" }} />
            )}
          </View>
          <View className="flex-1 flex-row">
            <View className="flex-1">
              {third ? (
                <Image contentFit="cover" source={{ uri: third }} style={{ width: "100%", height: "100%" }} />
              ) : (
                <View className="flex-1" style={{ backgroundColor: fallbackColors[2] ?? "#7c3aed" }} />
              )}
            </View>
            <View className="flex-1">
              {fourth ? (
                <Image contentFit="cover" source={{ uri: fourth }} style={{ width: "100%", height: "100%" }} />
              ) : (
                <View className="flex-1" style={{ backgroundColor: fallbackColors[3] ?? "#ea580c" }} />
              )}
            </View>
          </View>
        </View>
      </View>
      <View className="absolute inset-0 bg-black/25" />
    </View>
  );
}

function ProfileStats({
  memories,
  chapters,
  followers,
  following
}: {
  memories: number;
  chapters: number;
  followers: number;
  following: number;
}) {
  return (
    <View className="mt-4 flex-row flex-wrap gap-x-4 gap-y-2">
      <Text className="text-sm text-stone-300">{memories} memories</Text>
      <Text className="text-sm text-stone-300">{chapters} chapters</Text>
      <Text className="text-sm text-stone-300">{followers} followers</Text>
      <Text className="text-sm text-stone-300">{following} following</Text>
    </View>
  );
}

function MiniMapSnapshot({ pins }: { pins: ProfileGridPin[] }) {
  const featureCollection = useMemo(
    () =>
      ({
        type: "FeatureCollection",
        features: pins.map((pin) => ({
          type: "Feature",
          id: pin.id,
          properties: {
            id: pin.id
          },
          geometry: {
            type: "Point",
            coordinates: [pin.location.longitude, pin.location.latitude]
          }
        }))
      }) as const,
    [pins]
  );

  const center = useMemo(() => {
    if (pins.length === 0) {
      return {
        latitude: 20,
        longitude: 0
      };
    }

    const sum = pins.reduce(
      (accumulator, pin) => ({
        latitude: accumulator.latitude + pin.location.latitude,
        longitude: accumulator.longitude + pin.location.longitude
      }),
      { latitude: 0, longitude: 0 }
    );

    return {
      latitude: sum.latitude / pins.length,
      longitude: sum.longitude / pins.length
    };
  }, [pins]);

  if (!MAPBOX_TOKEN) {
    return (
      <View className="h-48 items-center justify-center rounded-[28px] bg-white/5">
        <Text className="text-sm text-stone-400">Map snapshot needs a Mapbox token.</Text>
      </View>
    );
  }

  return (
    <View className="overflow-hidden rounded-[28px] border border-white/10">
      <Mapbox.MapView
        attributionEnabled={false}
        compassEnabled={false}
        logoEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        scaleBarEnabled={false}
        scrollEnabled={false}
        style={{ height: 190 }}
        styleURL="mapbox://styles/mapbox/dark-v11"
        zoomEnabled={false}
      >
        <Mapbox.Camera
          defaultSettings={{
            centerCoordinate: [center.longitude, center.latitude],
            zoomLevel: 1.2
          }}
        />
        <Mapbox.ShapeSource cluster clusterRadius={44} shape={featureCollection}>
          <Mapbox.CircleLayer
            id="snapshot-clusters"
            filter={["has", "point_count"]}
            style={{
              circleColor: "#0f172a",
              circleStrokeColor: "#38bdf8",
              circleStrokeWidth: 2,
              circleRadius: 16
            }}
          />
          <Mapbox.SymbolLayer
            id="snapshot-cluster-count"
            filter={["has", "point_count"]}
            style={{
              textColor: "#e0f2fe",
              textField: ["get", "point_count"],
              textSize: 11
            }}
          />
          <Mapbox.CircleLayer
            id="snapshot-pins"
            filter={["!", ["has", "point_count"]]}
            style={{
              circleColor: "#38bdf8",
              circleOpacity: 0.88,
              circleRadius: 4,
              circleBlur: 0.3
            }}
          />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>
    </View>
  );
}

function TrailMap({ pins }: { pins: ProfileGridPin[] }) {
  const currentYear = new Date().getFullYear();
  const trailPins = useMemo(
    () =>
      pins
        .filter((pin) => new Date(pin.pinnedAt).getFullYear() === currentYear)
        .sort(
          (left, right) =>
            new Date(left.pinnedAt).getTime() - new Date(right.pinnedAt).getTime()
        ),
    [currentYear, pins]
  );

  const lineFeature = useMemo(
    () =>
      ({
        type: "FeatureCollection",
        features:
          trailPins.length >= 2
            ? [
                {
                  type: "Feature",
                  id: "trail-line",
                  geometry: {
                    type: "LineString",
                    coordinates: trailPins.map((pin) => [
                      pin.location.longitude,
                      pin.location.latitude
                    ])
                  },
                  properties: {}
                }
              ]
            : []
      }) as const,
    [trailPins]
  );

  const pointFeatureCollection = useMemo(
    () =>
      ({
        type: "FeatureCollection",
        features: trailPins.map((pin) => ({
          type: "Feature",
          id: pin.id,
          geometry: {
            type: "Point",
            coordinates: [pin.location.longitude, pin.location.latitude]
          },
          properties: {}
        }))
      }) as const,
    [trailPins]
  );

  const center = useMemo(() => {
    if (trailPins.length === 0) {
      return {
        latitude: 20,
        longitude: 0
      };
    }

    const sum = trailPins.reduce(
      (accumulator, pin) => ({
        latitude: accumulator.latitude + pin.location.latitude,
        longitude: accumulator.longitude + pin.location.longitude
      }),
      { latitude: 0, longitude: 0 }
    );

    return {
      latitude: sum.latitude / trailPins.length,
      longitude: sum.longitude / trailPins.length
    };
  }, [trailPins]);

  if (!MAPBOX_TOKEN) {
    return (
      <View className="h-44 items-center justify-center rounded-[28px] bg-white/5">
        <Text className="text-sm text-stone-400">Trail preview needs a Mapbox token.</Text>
      </View>
    );
  }

  return (
    <View className="overflow-hidden rounded-[28px] border border-white/10">
      <Mapbox.MapView
        attributionEnabled={false}
        compassEnabled={false}
        logoEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        scaleBarEnabled={false}
        scrollEnabled={false}
        style={{ height: 176 }}
        styleURL="mapbox://styles/mapbox/dark-v11"
        zoomEnabled={false}
      >
        <Mapbox.Camera
          defaultSettings={{
            centerCoordinate: [center.longitude, center.latitude],
            zoomLevel: 1.45
          }}
        />
        <Mapbox.ShapeSource shape={lineFeature}>
          <Mapbox.LineLayer
            id="trail-line"
            style={{
              lineColor: "#22c55e",
              lineOpacity: 0.8,
              lineWidth: 3
            }}
          />
        </Mapbox.ShapeSource>
        <Mapbox.ShapeSource shape={pointFeatureCollection}>
          <Mapbox.CircleLayer
            id="trail-points"
            style={{
              circleColor: "#86efac",
              circleRadius: 4,
              circleOpacity: 0.92,
              circleStrokeColor: "#052e16",
              circleStrokeWidth: 1.5
            }}
          />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>
      <View className="absolute right-4 top-4 rounded-full bg-emerald-400/20 px-3 py-2">
        <Text className="text-xs font-medium uppercase tracking-[1.6px] text-emerald-100">
          Replaying {currentYear}
        </Text>
      </View>
    </View>
  );
}

export default function UsernameProfileScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { username } = useLocalSearchParams<{ username: string }>();
  const resolvedUsername = typeof username === "string" ? username : "";
  const scrollY = useRef(new Animated.Value(0)).current;
  const profileQuery = useProfilePageByUsername(resolvedUsername, resolvedUsername.length > 0);
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  const compactHeaderOpacity = scrollY.interpolate({
    inputRange: [120, 200],
    outputRange: [0, 1],
    extrapolate: "clamp"
  });

  const coverImages = useMemo(
    () =>
      [
        ...((profileQuery.data?.chapters ?? [])
          .map((chapter) => chapter.coverUrl)
          .filter((value): value is string => typeof value === "string")),
        ...((profileQuery.data?.pins ?? [])
          .map((pin) => pin.thumbnailUrl)
          .filter((value): value is string => typeof value === "string"))
      ].slice(0, 4),
    [profileQuery.data?.chapters, profileQuery.data?.pins]
  );

  const fallbackColors = useMemo(
    () => (profileQuery.data?.chapters ?? []).map((chapter) => chapter.color).slice(0, 4),
    [profileQuery.data?.chapters]
  );

  useEffect(() => {
    if (!profileQuery.data?.profile.username) {
      return;
    }

    if (resolvedUsername !== profileQuery.data.profile.username) {
      router.replace(`/profile/${profileQuery.data.profile.username}`);
    }
  }, [profileQuery.data?.profile.username, resolvedUsername]);

  if (profileQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-950">
        <ActivityIndicator color="#38bdf8" />
      </View>
    );
  }

  if (!profileQuery.data) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-950 px-6">
        <Text className="text-center text-xl font-semibold text-white">Profile unavailable</Text>
        <Text className="mt-3 text-center text-sm text-stone-300">
          This profile could not be loaded.
        </Text>
      </View>
    );
  }

  const { profile, stats, chapters, pins, isOwnProfile, isFollowing } = profileQuery.data;

  return (
    <View className="flex-1 bg-stone-950">
      <Animated.View
        pointerEvents="none"
        className="absolute left-0 right-0 top-0 z-20 border-b border-white/10 bg-stone-950/94 px-5 pb-4"
        style={{
          opacity: compactHeaderOpacity,
          paddingTop: insets.top + 8
        }}
      >
        <Text className="text-sm text-stone-400">@{profile.username}</Text>
        <Text className="mt-1 text-xl font-semibold text-white">{profile.displayName}</Text>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        <View>
          <CoverCollage fallbackColors={fallbackColors} imageUrls={coverImages} />
          <View className="px-5">
            <View className="-mt-12 flex-row items-end justify-between">
              {profile.avatarUrl ? (
                <Image
                  contentFit="cover"
                  source={{ uri: profile.avatarUrl }}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 999,
                    borderWidth: 3,
                    borderColor: "#0c0a09"
                  }}
                />
              ) : (
                <View className="h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-stone-950 bg-sky-400">
                  <Text className="text-2xl font-semibold text-stone-950">
                    {profile.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              <Pressable
                accessibilityRole="button"
                className={`rounded-full px-5 py-3 ${
                  isOwnProfile
                    ? "border border-white/10 bg-stone-900"
                    : isFollowing
                      ? "border border-white/10 bg-stone-900"
                      : "bg-sky-400"
                }`}
                disabled={followMutation.isPending || unfollowMutation.isPending}
                onPress={async () => {
                  if (isOwnProfile) {
                    router.push("/profile");
                    return;
                  }

                  if (isFollowing) {
                    await unfollowMutation.mutateAsync(profile.id);
                  } else {
                    await followMutation.mutateAsync(profile.id);
                  }

                  await queryClient.invalidateQueries({
                    queryKey: ["profile-page", profile.username]
                  });
                }}
              >
                <Text
                  className={`text-sm font-semibold ${
                    !isOwnProfile && !isFollowing ? "text-stone-950" : "text-white"
                  }`}
                >
                  {isOwnProfile ? "Edit" : isFollowing ? "Following" : "Follow"}
                </Text>
              </Pressable>
            </View>

            <Text className="mt-4 text-sm text-stone-400">@{profile.username}</Text>
            <Text className="mt-1 text-3xl font-semibold text-white">{profile.displayName}</Text>
            <Text className="mt-3 text-sm leading-6 text-stone-300">
              {profile.bio ?? "Mapping stories, chapters, and trails."}
            </Text>
            <ProfileStats
              chapters={stats.chapters}
              followers={stats.followers}
              following={stats.following}
              memories={stats.memories}
            />
          </View>
        </View>

        <View className="mt-8 bg-stone-950 px-5 py-3">
          <Text className="text-lg font-semibold text-white">Highlights</Text>
        </View>

        <View className="px-5">
          <Text className="text-xl font-semibold text-white">
            {isOwnProfile ? "My chapters" : "Chapters"}
          </Text>
          <Text className="mt-1 text-sm text-stone-400">
            Narrative arcs instead of scattered posts.
          </Text>
        </View>

        <ScrollView
          className="mt-4 pl-5"
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {chapters.map((chapter) => (
            <Pressable
              accessibilityRole="button"
              className="mr-4 w-72 overflow-hidden rounded-[32px]"
              key={chapter.id}
              onPress={() => {
                router.push(`/chapter/${chapter.id}`);
              }}
              style={{ backgroundColor: chapter.color }}
            >
              {chapter.coverUrl ? (
                <Image
                  contentFit="cover"
                  source={{ uri: chapter.coverUrl }}
                  style={{ width: "100%", height: 160 }}
                />
              ) : (
                <View className="h-40 bg-black/20" />
              )}
              <View className="bg-black/30 px-5 py-4">
                <Text className="text-2xl font-semibold text-white">{chapter.title}</Text>
                <Text className="mt-2 text-sm text-white/80">
                  {chapter.pinCount} {chapter.pinCount === 1 ? "pin" : "pins"}
                </Text>
                <Text className="mt-1 text-sm text-white/80">
                  {formatDateRange(chapter.startedAt, chapter.endedAt)}
                </Text>
              </View>
            </Pressable>
          ))}

          {isOwnProfile ? (
            <Pressable
              accessibilityRole="button"
              className="mr-5 w-56 items-center justify-center rounded-[32px] border border-dashed border-white/20 bg-white/5 px-6"
              onPress={() => {
                router.push("/profile");
              }}
            >
              <Text className="text-xl font-semibold text-white">New chapter</Text>
              <Text className="mt-2 text-center text-sm leading-6 text-stone-300">
                Open chapter tools and add the next arc.
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>

        <View className="mt-10 px-5">
          <Text className="text-xl font-semibold text-white">Pinned memories</Text>
          <Text className="mt-1 text-sm text-stone-400">
            {isOwnProfile ? "Everything you chose to keep." : "Public moments from the map."}
          </Text>
        </View>

        <View className="mt-4 flex-row flex-wrap px-[6px]">
          {pins.map((pin) => (
            <Pressable
              accessibilityRole="button"
              className="mb-[6px] w-1/3 px-[3px]"
              key={pin.id}
              onPress={() => {
                router.push(`/pin/${pin.id}`);
              }}
            >
              <View className="aspect-square overflow-hidden rounded-[18px] bg-white/5">
                {pin.thumbnailUrl ? (
                  <Image
                    contentFit="cover"
                    source={{ uri: pin.thumbnailUrl }}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <View className="flex-1 items-center justify-center bg-stone-900">
                    <Text className="text-xs font-medium uppercase tracking-[1.6px] text-stone-400">
                      {pin.title}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </View>

        <View className="mt-10 px-5">
          <Text className="text-xl font-semibold text-white">Map snapshot</Text>
          <Text className="mt-1 text-sm text-stone-400">
            A compact look at how far the story reaches.
          </Text>
          <View className="mt-4">
            <MiniMapSnapshot pins={pins} />
          </View>
        </View>

        {isOwnProfile ? (
          <View className="mt-10 px-5">
            <Text className="text-xl font-semibold text-white">Your trails this year</Text>
            <Text className="mt-1 text-sm text-stone-400">
              Movement paths stitched from this year&apos;s memories.
            </Text>
            <View className="mt-4">
              <TrailMap pins={pins} />
            </View>
          </View>
        ) : null}
      </Animated.ScrollView>
    </View>
  );
}
