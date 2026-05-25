import Mapbox from "@rnmapbox/maps";
import { fetchPublicDiscoverPins, type DiscoverPin, type DiscoverTimeFilter } from "@imprint/api/discover";
import { fetchIpCityLocation } from "@imprint/api/mobile";
import type { Coordinates } from "@imprint/types";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  Text,
  View
} from "react-native";

type CoordinateTuple = [number, number];

interface CameraStatePayload {
  properties?: {
    zoom?: number;
    bounds?: {
      ne?: CoordinateTuple;
      sw?: CoordinateTuple;
    };
  };
}

interface DiscoverFilters {
  timeFilter: DiscoverTimeFilter;
  withPhotos: boolean;
  nearbyOnly: boolean;
}

interface InitialViewportState {
  coordinates: Coordinates;
  sourceLabel: string;
}

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
const MAPBOX_DARK_STYLE = "mapbox://styles/mapbox/dark-v11";
const DISCOVER_RADIUS_DEFAULT = 20_000;
const DISCOVER_RADIUS_NEARBY = 5_000;
const DEFAULT_ZOOM = 10.5;
const DEFAULT_VIEWPORT: InitialViewportState = {
  coordinates: {
    latitude: 40.7128,
    longitude: -74.006
  },
  sourceLabel: "Default city"
};
const PREVIEW_SHEET_HEIGHT = 280;

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
    return `${Math.round(distanceMeters)}m away`;
  }

  return `${(distanceMeters / 1000).toFixed(1)}km away`;
}

function formatPinDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(dateString));
}

function truncateBody(body?: string) {
  if (!body) {
    return "No story text shared yet.";
  }

  if (body.length <= 120) {
    return body;
  }

  return `${body.slice(0, 117)}...`;
}

function roundToTile(value: number, precision: number) {
  return Math.round(value / precision) * precision;
}

function computeTileKey(center: Coordinates, filters: DiscoverFilters, zoomLevel: number) {
  const tileSize = zoomLevel >= 12 ? 0.03 : zoomLevel >= 10 ? 0.08 : 0.18;
  return [
    roundToTile(center.latitude, tileSize).toFixed(3),
    roundToTile(center.longitude, tileSize).toFixed(3),
    filters.timeFilter,
    filters.withPhotos ? "photos" : "all",
    filters.nearbyOnly ? "nearby" : "wide"
  ].join(":");
}

function resolveCenterFromBounds(payload: CameraStatePayload) {
  const northEast = payload.properties?.bounds?.ne;
  const southWest = payload.properties?.bounds?.sw;

  if (!northEast || !southWest) {
    return null;
  }

  return {
    latitude: (northEast[1] + southWest[1]) / 2,
    longitude: (northEast[0] + southWest[0]) / 2
  } satisfies Coordinates;
}

function pinToFeature(pin: DiscoverPin) {
  return {
    type: "Feature",
    id: pin.id,
    properties: {
      id: pin.id,
      title: pin.title,
      chapterColor: pin.chapter?.color ?? "#f97316"
    },
    geometry: {
      type: "Point",
      coordinates: [pin.location.longitude, pin.location.latitude]
    }
  } as const;
}

async function resolveInitialViewport() {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.granted) {
    const lastKnown = await Location.getLastKnownPositionAsync();
    if (lastKnown) {
      return {
        coordinates: {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude
        },
        sourceLabel: "Last known location"
      } satisfies InitialViewportState;
    }

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });

    return {
      coordinates: {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude
      },
      sourceLabel: "Current location"
    } satisfies InitialViewportState;
  }

  const ipCity = await fetchIpCityLocation();
  return {
    coordinates: ipCity.coordinates,
    sourceLabel: ipCity.cityName
  } satisfies InitialViewportState;
}

function FilterChip({
  label,
  selected,
  onPress
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`mr-3 rounded-full border px-4 py-3 ${
        selected
          ? "border-amber-300/60 bg-amber-300/15"
          : "border-white/10 bg-stone-950/88"
      }`}
      onPress={onPress}
    >
      <Text
        className={`text-xs font-medium uppercase tracking-[1.6px] ${
          selected ? "text-amber-100" : "text-stone-200"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PinPreviewCard({
  pin,
  distanceFromUser,
  reactionCount,
  onClose,
  onHeartPress
}: {
  pin: DiscoverPin | null;
  distanceFromUser: string | null;
  reactionCount: number;
  onClose: () => void;
  onHeartPress: () => void;
}) {
  const translateY = useRef(new Animated.Value(PREVIEW_SHEET_HEIGHT + 40)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: pin ? 0 : PREVIEW_SHEET_HEIGHT + 40,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
      mass: 0.9
    }).start();
  }, [pin, translateY]);

  if (!pin) {
    return (
      <Animated.View
        pointerEvents="none"
        style={{
          transform: [{ translateY }],
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0
        }}
      />
    );
  }

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0
      }}
    >
      <View className="rounded-t-[32px] border border-white/10 bg-stone-950/96 px-5 pb-8 pt-3">
        <View className="mb-4 items-center">
          <View className="h-1.5 w-14 rounded-full bg-white/20" />
        </View>
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            className="flex-1 flex-row items-center gap-3"
            onPress={() => {
              router.push({
                pathname: "/profile",
                params: { userId: pin.author.id }
              });
            }}
          >
            {pin.author.avatarUrl ? (
              <Image
                contentFit="cover"
                source={{ uri: pin.author.avatarUrl }}
                style={{ width: 44, height: 44, borderRadius: 999 }}
              />
            ) : (
              <View className="h-11 w-11 items-center justify-center rounded-full bg-amber-300">
                <Text className="text-base font-semibold text-stone-950">
                  {pin.author.username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View className="flex-1">
              <Text className="text-sm font-semibold text-white">{pin.author.username}</Text>
              <Text className="mt-1 text-xs text-stone-400">
                {formatPinDate(pin.pinnedAt)}
                {distanceFromUser ? ` · ${distanceFromUser}` : ""}
              </Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            className="rounded-full border border-white/10 px-3 py-2"
            onPress={onClose}
          >
            <Text className="text-xs font-medium uppercase tracking-[1.6px] text-stone-300">
              Close
            </Text>
          </Pressable>
        </View>

        <Text className="mt-4 text-xl font-semibold text-white">{pin.title}</Text>

        {pin.mediaUrls[0] ? (
          <Image
            contentFit="cover"
            source={{ uri: pin.mediaUrls[0] }}
            style={{ width: "100%", height: 120, borderRadius: 24, marginTop: 16 }}
          />
        ) : null}

        <Text className="mt-4 text-sm leading-6 text-stone-300">{truncateBody(pin.body)}</Text>
        {pin.body && pin.body.length > 120 ? (
          <Text className="mt-1 text-xs font-medium uppercase tracking-[1.6px] text-amber-200">
            Read more
          </Text>
        ) : null}

        <View className="mt-5 flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            className="rounded-full border border-white/10 px-4 py-3"
            onPress={onHeartPress}
          >
            <Text className="text-sm font-medium text-white">Heart · {reactionCount}</Text>
          </Pressable>

          {pin.chapter?.id ? (
            <Pressable
              accessibilityRole="button"
              className="rounded-full bg-amber-300 px-5 py-3"
              onPress={() => {
                router.push(`/chapter/${pin.chapter?.id}`);
              }}
            >
              <Text className="text-sm font-semibold text-stone-950">
                See on author&apos;s chapter
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

export default function DiscoverScreen() {
  const cameraRef = useRef<Mapbox.Camera>(null);
  const shapeSourceRef = useRef<Mapbox.ShapeSource>(null);
  const fetchedTileKeysRef = useRef<Set<string>>(new Set());
  const [initialViewport, setInitialViewport] =
    useState<InitialViewportState>(DEFAULT_VIEWPORT);
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const [filters, setFilters] = useState<DiscoverFilters>({
    timeFilter: "recent",
    withPhotos: false,
    nearbyOnly: false
  });
  const [pins, setPins] = useState<DiscoverPin[]>([]);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [currentCenter, setCurrentCenter] = useState<Coordinates | null>(null);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [isLoading, setIsLoading] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        const viewport = await resolveInitialViewport();
        if (!isMounted) {
          return;
        }

        setInitialViewport(viewport);
        setUserCoordinates(viewport.coordinates);
        setCurrentCenter(viewport.coordinates);
        setStatusMessage(`Starting from ${viewport.sourceLabel}.`);
      } catch {
        if (isMounted) {
          setUserCoordinates(DEFAULT_VIEWPORT.coordinates);
          setCurrentCenter(DEFAULT_VIEWPORT.coordinates);
          setStatusMessage("Could not resolve your location. Using a default city.");
        }
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    fetchedTileKeysRef.current.clear();
    setPins([]);
    setSelectedPinId(null);
  }, [filters.nearbyOnly, filters.timeFilter, filters.withPhotos]);

  const selectedPin = useMemo(
    () => pins.find((pin) => pin.id === selectedPinId) ?? null,
    [pins, selectedPinId]
  );

  const distanceFromUser = useMemo(() => {
    if (!selectedPin || !userCoordinates) {
      return null;
    }

    return formatDistance(haversineDistance(userCoordinates, selectedPin.location));
  }, [selectedPin, userCoordinates]);

  const featureCollection = useMemo(
    () =>
      ({
        type: "FeatureCollection",
        features: pins.map((pin) => pinToFeature(pin))
      }) as const,
    [pins]
  );

  const loadTile = useCallback(
    async (center: Coordinates, currentFilters: DiscoverFilters, nextZoomLevel: number) => {
      const tileKey = computeTileKey(center, currentFilters, nextZoomLevel);
      if (fetchedTileKeysRef.current.has(tileKey)) {
        return;
      }

      fetchedTileKeysRef.current.add(tileKey);
      setIsLoading(true);

      try {
        const nextPins = await fetchPublicDiscoverPins({
          center,
          radiusMeters: currentFilters.nearbyOnly
            ? DISCOVER_RADIUS_NEARBY
            : DISCOVER_RADIUS_DEFAULT,
          timeFilter: currentFilters.timeFilter,
          withPhotos: currentFilters.withPhotos,
          limit: 30
        });

        setPins((currentPins) => {
          const deduped = new Map(currentPins.map((pin) => [pin.id, pin]));
          for (const pin of nextPins) {
            deduped.set(pin.id, pin);
          }
          return Array.from(deduped.values()).sort(
            (left, right) =>
              new Date(right.pinnedAt).getTime() - new Date(left.pinnedAt).getTime()
          );
        });

        setReactionCounts((currentCounts) => {
          const nextCounts = { ...currentCounts };
          for (const pin of nextPins) {
            if (nextCounts[pin.id] === undefined) {
              nextCounts[pin.id] = pin.reactionCount;
            }
          }
          return nextCounts;
        });
      } catch (error) {
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Couldn’t load public memories in this area."
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!isMapReady || !currentCenter) {
      return;
    }

    void loadTile(currentCenter, filters, zoomLevel);
  }, [currentCenter, filters, isMapReady, loadTile, zoomLevel]);

  useEffect(() => {
    if (!isMapReady || !cameraRef.current) {
      return;
    }

    cameraRef.current.setCamera({
      centerCoordinate: [
        initialViewport.coordinates.longitude,
        initialViewport.coordinates.latitude
      ],
      zoomLevel: DEFAULT_ZOOM,
      animationDuration: 0
    });
  }, [initialViewport.coordinates.latitude, initialViewport.coordinates.longitude, isMapReady]);

  const handleMapIdle = useCallback((payload: CameraStatePayload) => {
    const nextCenter = resolveCenterFromBounds(payload);
    if (nextCenter) {
      setCurrentCenter(nextCenter);
    }

    if (typeof payload.properties?.zoom === "number") {
      setZoomLevel(payload.properties.zoom);
    }
  }, []);

  const handleShapePress = useCallback(
    async (event: { features?: Array<{ properties?: Record<string, unknown>; geometry?: { coordinates?: unknown } }> }) => {
      const feature = event.features?.[0];
      if (!feature?.properties) {
        return;
      }

      if (feature.properties.cluster === true) {
        const expansionZoom = await shapeSourceRef.current?.getClusterExpansionZoom(feature);
        const coordinates = feature.geometry?.coordinates;
        if (
          typeof expansionZoom === "number" &&
          Array.isArray(coordinates) &&
          coordinates.length >= 2 &&
          typeof coordinates[0] === "number" &&
          typeof coordinates[1] === "number"
        ) {
          await Haptics.selectionAsync();
          cameraRef.current?.setCamera({
            centerCoordinate: [coordinates[0], coordinates[1]],
            zoomLevel: expansionZoom,
            animationDuration: 420
          });
        }
        return;
      }

      const pinId = typeof feature.properties.id === "string" ? feature.properties.id : null;
      if (!pinId) {
        return;
      }

      await Haptics.selectionAsync();
      setSelectedPinId(pinId);
    },
    []
  );

  const selectedReactionCount = selectedPin ? reactionCounts[selectedPin.id] ?? 0 : 0;

  return (
    <View className="flex-1 bg-stone-950">
      {MAPBOX_TOKEN ? (
        <Mapbox.MapView
          attributionEnabled={false}
          className="flex-1"
          compassEnabled
          logoEnabled={false}
          onDidFinishLoadingMap={() => {
            setIsMapReady(true);
          }}
          onMapIdle={handleMapIdle}
          pitchEnabled={false}
          rotateEnabled={false}
          scaleBarEnabled={false}
          styleURL={MAPBOX_DARK_STYLE}
        >
          <Mapbox.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: [
                initialViewport.coordinates.longitude,
                initialViewport.coordinates.latitude
              ],
              zoomLevel: DEFAULT_ZOOM
            }}
          />
          <Mapbox.ShapeSource
            ref={shapeSourceRef}
            cluster
            clusterMaxZoomLevel={11}
            clusterRadius={52}
            onPress={handleShapePress}
            shape={featureCollection}
          >
            <Mapbox.HeatmapLayer
              id="discover-hotspots"
              style={{
                heatmapColor: [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0,
                  "rgba(249,115,22,0)",
                  0.35,
                  "rgba(249,115,22,0.24)",
                  0.7,
                  "rgba(245,158,11,0.5)",
                  1,
                  "rgba(251,191,36,0.8)"
                ],
                heatmapIntensity: 1,
                heatmapRadius: 28,
                heatmapOpacity: 0.72
              }}
            />
            <Mapbox.CircleLayer
              filter={["has", "point_count"]}
              id="discover-clusters"
              style={{
                circleColor: "#7c2d12",
                circleOpacity: 0.82,
                circleRadius: [
                  "step",
                  ["get", "point_count"],
                  16,
                  10,
                  22,
                  25,
                  28
                ],
                circleStrokeColor: "#fdba74",
                circleStrokeWidth: 2
              }}
            />
            <Mapbox.SymbolLayer
              filter={["has", "point_count"]}
              id="discover-cluster-count"
              style={{
                textColor: "#fff7ed",
                textField: ["get", "point_count"],
                textSize: 12
              }}
            />
            <Mapbox.CircleLayer
              filter={["!", ["has", "point_count"]]}
              id="discover-public-pins"
              style={{
                circleColor: ["coalesce", ["get", "chapterColor"], "#f97316"],
                circleOpacity: 0.92,
                circleRadius: 6,
                circleBlur: 0.55,
                circleStrokeColor: "#fff7ed",
                circleStrokeWidth: 1.5
              }}
            />
          </Mapbox.ShapeSource>
        </Mapbox.MapView>
      ) : (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-lg font-semibold text-white">
            Mapbox token missing
          </Text>
          <Text className="mt-3 text-center text-sm text-stone-300">
            Set `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` to render Discovery.
          </Text>
        </View>
      )}

      <View className="absolute left-4 right-4 top-14">
        <View className="flex-row">
          <FilterChip
            label="Recent"
            onPress={() => {
              setFilters((current) => ({ ...current, timeFilter: "recent" }));
            }}
            selected={filters.timeFilter === "recent"}
          />
          <FilterChip
            label="All time"
            onPress={() => {
              setFilters((current) => ({ ...current, timeFilter: "all-time" }));
            }}
            selected={filters.timeFilter === "all-time"}
          />
          <FilterChip
            label="With photos"
            onPress={() => {
              setFilters((current) => ({ ...current, withPhotos: !current.withPhotos }));
            }}
            selected={filters.withPhotos}
          />
          <FilterChip
            label="Nearby"
            onPress={() => {
              setFilters((current) => ({ ...current, nearbyOnly: !current.nearbyOnly }));
            }}
            selected={filters.nearbyOnly}
          />
        </View>

        {statusMessage ? (
          <View className="mt-3 self-start rounded-full border border-white/10 bg-stone-950/88 px-4 py-2">
            <Text className="text-xs font-medium text-stone-200">{statusMessage}</Text>
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <View className="absolute right-4 top-28 rounded-full border border-white/10 bg-stone-950/88 px-4 py-3">
          <ActivityIndicator color="#f59e0b" />
        </View>
      ) : null}

      {pins.length === 0 && isMapReady && !isLoading ? (
        <View className="absolute inset-x-0 bottom-32 items-center px-6">
          <View className="rounded-2xl border border-white/10 bg-stone-950/88 px-4 py-3">
            <Text className="text-center text-sm text-stone-200">
              No public memories in this area yet. Try panning wider.
            </Text>
          </View>
        </View>
      ) : null}

      <PinPreviewCard
        distanceFromUser={distanceFromUser}
        onClose={() => {
          setSelectedPinId(null);
        }}
        onHeartPress={() => {
          if (!selectedPin) {
            return;
          }
          void Haptics.selectionAsync();
          setReactionCounts((current) => ({
            ...current,
            [selectedPin.id]: (current[selectedPin.id] ?? 0) + 1
          }));
        }}
        pin={selectedPin}
        reactionCount={selectedReactionCount}
      />
    </View>
  );
}
