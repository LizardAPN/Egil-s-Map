import Mapbox from "@rnmapbox/maps";
import { getEchoPinById } from "@imprint/api/echoes";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

if (MAPBOX_TOKEN.length > 0) {
  Mapbox.setAccessToken(MAPBOX_TOKEN);
}

function formatPinnedDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(dateString));
}

export default function PinDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string;
    latitude?: string;
    longitude?: string;
  }>();
  const pinQuery = useQuery({
    queryKey: ["echo-pin", params.id],
    queryFn: async () => getEchoPinById(params.id),
    enabled: typeof params.id === "string" && params.id.length > 0
  });

  const pin = pinQuery.data;
  const centerLatitude =
    typeof params.latitude === "string" ? Number(params.latitude) : pin?.location.latitude;
  const centerLongitude =
    typeof params.longitude === "string" ? Number(params.longitude) : pin?.location.longitude;

  if (pinQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-950">
        <ActivityIndicator color="#38bdf8" />
      </View>
    );
  }

  if (!pin || typeof centerLatitude !== "number" || typeof centerLongitude !== "number") {
    return (
      <View className="flex-1 items-center justify-center bg-stone-950 px-6">
        <Text className="text-center text-xl font-semibold text-white">Memory unavailable</Text>
        <Text className="mt-3 text-center text-sm text-stone-300">
          This memory could not be opened, or it is no longer visible to you.
        </Text>
        <Pressable
          accessibilityRole="button"
          className="mt-6 rounded-full bg-sky-400 px-5 py-3"
          onPress={() => {
            router.back();
          }}
        >
          <Text className="text-sm font-semibold text-stone-950">Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-stone-950">
      {MAPBOX_TOKEN ? (
        <Mapbox.MapView
          attributionEnabled={false}
          className="flex-1"
          compassEnabled={false}
          logoEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          scaleBarEnabled={false}
          styleURL="mapbox://styles/mapbox/dark-v11"
        >
          <Mapbox.Camera
            defaultSettings={{
              centerCoordinate: [centerLongitude, centerLatitude],
              zoomLevel: 14
            }}
          />
          <Mapbox.PointAnnotation coordinate={[centerLongitude, centerLatitude]} id={pin.id}>
            <View className="h-5 w-5 rounded-full border-2 border-white bg-sky-400" />
          </Mapbox.PointAnnotation>
        </Mapbox.MapView>
      ) : (
        <View className="flex-1 bg-stone-950" />
      )}

      <View
        className="absolute left-0 right-0 top-0 rounded-b-[32px] border-b border-white/10 bg-stone-950/96 px-5 pb-5"
        style={{ paddingTop: insets.top + 12 }}
      >
        <View className="mb-3 flex-row items-center justify-between">
          <View>
            <Text className="text-xs uppercase tracking-[1.6px] text-stone-500">Echo</Text>
            <Text className="mt-2 text-2xl font-semibold text-white">{pin.title}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            className="rounded-full border border-white/10 px-3 py-2"
            onPress={() => {
              router.back();
            }}
          >
            <Text className="text-xs font-medium uppercase tracking-[1.6px] text-stone-300">
              Close
            </Text>
          </Pressable>
        </View>
        <Text className="text-sm text-stone-400">
          {pin.author.username} · {formatPinnedDate(pin.pinnedAt)}
        </Text>
      </View>

      <View className="absolute bottom-0 left-0 right-0 max-h-[48%] rounded-t-[32px] border border-white/10 bg-stone-950/96 px-5 pt-4">
        <View className="mb-3 items-center">
          <View className="h-1.5 w-14 rounded-full bg-white/20" />
        </View>
        <ScrollView
          bounces={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 18) }}
          showsVerticalScrollIndicator={false}
        >
          {pin.mediaUrls[0] ? (
            <Image
              contentFit="cover"
              source={{ uri: pin.mediaUrls[0] }}
              style={{ width: "100%", height: 180, borderRadius: 24 }}
            />
          ) : null}
          <Text className="mt-4 text-sm leading-7 text-stone-200">
            {pin.body ?? "No story text was shared for this memory."}
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}
