import Mapbox from "@rnmapbox/maps";
import { useChapterDetail, type ChapterPin } from "@imprint/api/chapters";
import * as Location from "expo-location";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
const HEADER_MAX_HEIGHT = 240;
const HEADER_MIN_HEIGHT = 104;

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

function formatPinDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(dateString));
}

function computeCenter(pins: ChapterPin[]) {
  if (pins.length === 0) {
    return {
      latitude: 40.7128,
      longitude: -74.006
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
}

function ReverseGeocodedPinRow({
  pin,
  chapterColor
}: {
  pin: ChapterPin;
  chapterColor: string;
}) {
  const [locationName, setLocationName] = useState<string>("Locating...");

  useEffect(() => {
    let isMounted = true;

    async function resolveLocation() {
      try {
        const places = await Location.reverseGeocodeAsync({
          latitude: pin.location.latitude,
          longitude: pin.location.longitude
        });

        if (!isMounted) {
          return;
        }

        const place = places[0];
        if (!place) {
          setLocationName("Unknown place");
          return;
        }

        const parts = [place.name, place.city, place.region].filter(
          (part): part is string => typeof part === "string" && part.length > 0
        );
        setLocationName(parts.join(", "));
      } catch {
        if (isMounted) {
          setLocationName("Location unavailable offline");
        }
      }
    }

    void resolveLocation();

    return () => {
      isMounted = false;
    };
  }, [pin.location.latitude, pin.location.longitude]);

  return (
    <View className="mb-3 flex-row overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
      {pin.thumbnailUrl ? (
        <Image
          contentFit="cover"
          source={{ uri: pin.thumbnailUrl }}
          style={{ width: 88, height: 88 }}
        />
      ) : (
        <View
          className="h-[88px] w-[88px] items-center justify-center"
          style={{ backgroundColor: `${chapterColor}55` }}
        >
          <Text className="text-xs font-semibold uppercase tracking-[1.6px] text-white">
            Pin
          </Text>
        </View>
      )}
      <View className="flex-1 px-4 py-3">
        <Text className="text-base font-semibold text-white">{pin.title}</Text>
        <Text className="mt-1 text-sm text-stone-400">{formatPinDate(pin.pinnedAt)}</Text>
        <Text className="mt-2 text-sm text-stone-300">{locationName}</Text>
      </View>
    </View>
  );
}

export default function ChapterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const chapterQuery = useChapterDetail(id ?? "", Boolean(id));
  const chapter = chapterQuery.data;
  const center = useMemo(() => computeCenter(chapter?.pins ?? []), [chapter?.pins]);
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: "clamp"
  });

  const featureCollection = useMemo(
    () =>
      ({
        type: "FeatureCollection",
        features: (chapter?.pins ?? []).map((pin) => ({
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
    [chapter?.pins]
  );

  if (chapterQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-950">
        <ActivityIndicator color="#38bdf8" />
      </View>
    );
  }

  if (!chapter) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-950 px-6">
        <Text className="text-center text-lg font-semibold text-white">Chapter unavailable</Text>
        <Text className="mt-3 text-center text-sm text-stone-300">
          This chapter could not be loaded right now.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-stone-950">
      {MAPBOX_TOKEN ? (
        <Mapbox.MapView
          attributionEnabled={false}
          compassEnabled={false}
          logoEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          scaleBarEnabled={false}
          style={{ flex: 1 }}
          styleURL="mapbox://styles/mapbox/dark-v11"
        >
          <Mapbox.Camera
            defaultSettings={{
              centerCoordinate: [center.longitude, center.latitude],
              zoomLevel: chapter.pins.length > 1 ? 10.5 : 13
            }}
          />
          <Mapbox.ShapeSource shape={featureCollection as never}>
            <Mapbox.CircleLayer
              id="chapter-pins"
              style={{
                circleColor: chapter.color,
                circleOpacity: 0.95,
                circleRadius: 8,
                circleStrokeColor: "#f8fafc",
                circleStrokeWidth: 2
              }}
            />
          </Mapbox.ShapeSource>
        </Mapbox.MapView>
      ) : (
        <View className="flex-1 items-center justify-center bg-stone-950 px-6">
          <Text className="text-center text-sm text-stone-300">
            Set `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` to see the chapter map.
          </Text>
        </View>
      )}

      <Animated.View
        className="absolute left-0 right-0 overflow-hidden border-b border-white/10 bg-stone-950/92 px-5"
        style={{
          height: headerHeight,
          paddingTop: insets.top + 12
        }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-3xl font-semibold text-white">{chapter.title}</Text>
            <Text className="mt-2 text-sm text-stone-300">
              {chapter.description ?? "No chapter description yet."}
            </Text>
            <Text className="mt-3 text-xs uppercase tracking-[1.6px]" style={{ color: chapter.color }}>
              {formatDateRange(chapter.startedAt, chapter.endedAt)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            className="rounded-full border border-white/10 px-3 py-2"
            onPress={() => {
              router.back();
            }}
          >
            <Text className="text-xs font-medium uppercase tracking-[1.6px] text-stone-300">
              Back
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      <Animated.View
        className="absolute bottom-0 left-0 right-0 rounded-t-[32px] border border-white/10 bg-stone-950/95 px-5 pt-4"
        style={{
          paddingBottom: Math.max(insets.bottom, 18),
          maxHeight: "48%"
        }}
      >
        <View className="mb-3 items-center">
          <View className="h-1.5 w-14 rounded-full bg-white/20" />
        </View>
        <Text className="mb-4 text-lg font-semibold text-white">Memories in order</Text>
        <Animated.FlatList
          data={chapter.pins}
          keyExtractor={(item) => item.id}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          renderItem={({ item }) => (
            <ReverseGeocodedPinRow chapterColor={chapter.color} pin={item} />
          )}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>

      <Pressable
        accessibilityRole="button"
        className="absolute bottom-6 right-5 rounded-full px-5 py-4"
        onPress={() => {
          router.push({
            pathname: "/create-pin",
            params: {
              latitude: String(center.latitude),
              longitude: String(center.longitude),
              chapterId: chapter.id
            }
          });
        }}
        style={{
          backgroundColor: chapter.color
        }}
      >
        <Text className="text-sm font-semibold text-stone-950">Add memory here</Text>
      </Pressable>
    </View>
  );
}
