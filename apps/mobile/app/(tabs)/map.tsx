import Mapbox from "@rnmapbox/maps";
import { useNetInfo } from "@react-native-community/netinfo";
import type { MemoryPinMapItem } from "@imprint/api/mobile";
import {
  createSupabaseMobileClient,
  fetchIpCityLocation,
  useMemoryPinDetail,
  useMemoryPinsInBounds,
  type Bounds
} from "@imprint/api/mobile";
import { boundsContainCoordinates } from "@imprint/api/pins";
import type { Coordinates } from "@imprint/types";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View
} from "react-native";
import { MemoryPinBottomSheet } from "../../src/components/memory-pin-bottom-sheet";
import { useMemoryMapStore } from "../../src/store/memory-map-store";

type CoordinateTuple = [number, number];

interface ShapeFeatureProperties {
  id: string;
  title: string;
  chapterColor: string;
  chapterName: string | null;
  thumbnailUrl: string | null;
  cluster?: boolean;
  cluster_id?: number;
  point_count?: number;
}

interface PressedFeature {
  id?: string | number;
  properties?: ShapeFeatureProperties;
  geometry?: {
    coordinates?: unknown;
  };
}

interface CameraStatePayload {
  properties?: {
    zoom?: number;
    bounds?: {
      ne?: CoordinateTuple;
      sw?: CoordinateTuple;
    };
  };
}

interface InitialViewportState {
  coordinates: Coordinates;
  sourceLabel: string;
  permissionDenied?: boolean;
}

const DEFAULT_VIEWPORT: InitialViewportState = {
  coordinates: {
    latitude: 40.7128,
    longitude: -74.006
  },
  sourceLabel: "Default city"
};
const DEFAULT_ZOOM_LEVEL = 11;
const CLUSTER_BREAKPOINT = 12;
const MAPBOX_DARK_STYLE = "mapbox://styles/mapbox/dark-v11";
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

if (MAPBOX_TOKEN.length > 0) {
  Mapbox.setAccessToken(MAPBOX_TOKEN);
}

function isCoordinateTuple(value: unknown): value is CoordinateTuple {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}

function toBounds(payload: CameraStatePayload): Bounds | null {
  const northEast = payload.properties?.bounds?.ne;
  const southWest = payload.properties?.bounds?.sw;

  if (!northEast || !southWest) {
    return null;
  }

  return {
    northEast: {
      latitude: northEast[1],
      longitude: northEast[0]
    },
    southWest: {
      latitude: southWest[1],
      longitude: southWest[0]
    }
  };
}

function roundCoordinate(value: number) {
  return Math.round(value * 1000) / 1000;
}

function normalizeBounds(bounds: Bounds | null) {
  if (!bounds) {
    return null;
  }

  return {
    northEast: {
      latitude: roundCoordinate(bounds.northEast.latitude),
      longitude: roundCoordinate(bounds.northEast.longitude)
    },
    southWest: {
      latitude: roundCoordinate(bounds.southWest.latitude),
      longitude: roundCoordinate(bounds.southWest.longitude)
    }
  } satisfies Bounds;
}

function isOfflineError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("network") ||
    message.includes("offline") ||
    message.includes("fetch") ||
    message.includes("timed out")
  );
}

function pinToFeature(pin: MemoryPinMapItem) {
  return {
    type: "Feature",
    id: pin.id,
    properties: {
      id: pin.id,
      title: pin.title,
      chapterColor: pin.chapter?.color ?? "#38bdf8",
      chapterName: pin.chapter?.title ?? null,
      thumbnailUrl: pin.thumbnailUrl ?? null
    } satisfies ShapeFeatureProperties,
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
    sourceLabel: ipCity.cityName,
    permissionDenied: true
  } satisfies InitialViewportState;
}

export default function MemoryMapScreen() {
  const cameraRef = useRef<Mapbox.Camera>(null);
  const shapeSourceRef = useRef<Mapbox.ShapeSource>(null);
  const netInfo = useNetInfo();
  const {
    selectedPinId,
    optimisticPins,
    focusTarget,
    setSelectedPinId,
    clearFocusTarget
  } = useMemoryMapStore();
  const [initialViewport, setInitialViewport] =
    useState<InitialViewportState>(DEFAULT_VIEWPORT);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM_LEVEL);
  const [isMapReady, setIsMapReady] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapViewport() {
      try {
        const viewport = await resolveInitialViewport();
        if (!isMounted) {
          return;
        }

        setInitialViewport(viewport);
        setLocationMessage(
          viewport.permissionDenied
            ? `Location permission denied. Starting from ${viewport.sourceLabel}.`
            : `Starting from ${viewport.sourceLabel}.`
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setInitialViewport(DEFAULT_VIEWPORT);
        setLocationMessage("Could not resolve your location. Using a default city.");
      }
    }

    void bootstrapViewport();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      return;
    }

    try {
      createSupabaseMobileClient();
    } catch {
      return;
    }
  }, []);

  const normalizedBounds = useMemo(() => normalizeBounds(bounds), [bounds]);
  const pinsQuery = useMemoryPinsInBounds({
    bounds:
      normalizedBounds ??
      ({
        northEast: initialViewport.coordinates,
        southWest: initialViewport.coordinates
      } satisfies Bounds),
    enabled: normalizedBounds !== null && isMapReady
  });
  const pinDetailQuery = useMemoryPinDetail(selectedPinId);
  const visibleOptimisticPins = useMemo(
    () =>
      optimisticPins.filter((pin) =>
        boundsContainCoordinates(normalizedBounds, pin.location)
      ),
    [normalizedBounds, optimisticPins]
  );
  const mergedPins = useMemo(() => {
    const deduped = new Map<string, MemoryPinMapItem>();
    for (const pin of pinsQuery.data ?? []) {
      deduped.set(pin.id, pin);
    }
    for (const pin of visibleOptimisticPins) {
      deduped.set(pin.id, pin);
    }
    return Array.from(deduped.values());
  }, [pinsQuery.data, visibleOptimisticPins]);
  const fallbackSelectedPin = useMemo(
    () => mergedPins.find((pin) => pin.id === selectedPinId) ?? null,
    [mergedPins, selectedPinId]
  );

  useEffect(() => {
    if (!focusTarget || !cameraRef.current) {
      return;
    }

    cameraRef.current.setCamera({
      centerCoordinate: [focusTarget.coordinates.longitude, focusTarget.coordinates.latitude],
      zoomLevel: 14,
      animationDuration: 800
    });
    clearFocusTarget();
  }, [clearFocusTarget, focusTarget]);

  const featureCollection = useMemo(
    () =>
      ({
        type: "FeatureCollection",
        features: mergedPins.map((pin) => pinToFeature(pin))
      }) as const,
    [mergedPins]
  );

  const showOfflineBanner =
    netInfo.isConnected === false || (pinsQuery.error ? isOfflineError(pinsQuery.error) : false);
  const noPinsInArea = isMapReady && !pinsQuery.isLoading && mergedPins.length === 0;
  const supabaseMissing =
    !process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const pinDetailErrorMessage = pinDetailQuery.error
    ? "This memory could not be loaded right now. If you're offline, reconnect and try again."
    : null;

  const handleMapIdle = useCallback((payload: CameraStatePayload) => {
    const nextBounds = toBounds(payload);
    if (nextBounds) {
      setBounds(nextBounds);
    }

    if (typeof payload.properties?.zoom === "number") {
      setZoomLevel(payload.properties.zoom);
    }
  }, []);

  const handleLongPress = useCallback((event: PressedFeature) => {
    const coordinates = event.geometry?.coordinates;
    if (!isCoordinateTuple(coordinates)) {
      return;
    }

    router.push({
      pathname: "/create-pin",
      params: {
        latitude: String(coordinates[1]),
        longitude: String(coordinates[0])
      }
    });
  }, []);

  const handleShapePress = useCallback(
    async (event: { features?: PressedFeature[] }) => {
      const feature = event.features?.[0];
      if (!feature?.properties) {
        return;
      }

      if (feature.properties.cluster) {
        const expansionZoom = await shapeSourceRef.current?.getClusterExpansionZoom(feature);
        const coordinates = feature.geometry?.coordinates;

        if (
          typeof expansionZoom === "number" &&
          isCoordinateTuple(coordinates) &&
          cameraRef.current
        ) {
          cameraRef.current.setCamera({
            centerCoordinate: coordinates,
            zoomLevel: expansionZoom,
            animationDuration: 450
          });
        }

        return;
      }

      const pinId = feature.properties.id;
      if (typeof pinId === "string") {
        setSelectedPinId(pinId);
      }
    },
    [setSelectedPinId]
  );

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
          onLongPress={handleLongPress}
          onMapIdle={handleMapIdle}
          pitchEnabled={false}
          rotateEnabled={false}
          scaleBarEnabled={false}
          styleURL={MAPBOX_DARK_STYLE}
        >
          <Mapbox.Camera
            ref={cameraRef}
            centerCoordinate={[
              initialViewport.coordinates.longitude,
              initialViewport.coordinates.latitude
            ]}
            defaultSettings={{
              centerCoordinate: [
                initialViewport.coordinates.longitude,
                initialViewport.coordinates.latitude
              ],
              zoomLevel: DEFAULT_ZOOM_LEVEL
            }}
            zoomLevel={DEFAULT_ZOOM_LEVEL}
          />
          <Mapbox.LocationPuck visible />

          <Mapbox.ShapeSource
            ref={shapeSourceRef}
            cluster
            clusterMaxZoomLevel={CLUSTER_BREAKPOINT - 1}
            clusterRadius={48}
            onPress={handleShapePress}
            shape={featureCollection}
          >
            <Mapbox.CircleLayer
              id="clustered-pins"
              belowLayerID="unclustered-pins"
              filter={["has", "point_count"]}
              style={{
                circleColor: "#0f172a",
                circleOpacity: 0.92,
                circleRadius: [
                  "step",
                  ["get", "point_count"],
                  18,
                  10,
                  22,
                  25,
                  28
                ],
                circleStrokeColor: "#38bdf8",
                circleStrokeWidth: 2
              }}
            />
            <Mapbox.SymbolLayer
              id="cluster-count"
              filter={["has", "point_count"]}
              style={{
                textColor: "#e0f2fe",
                textField: ["get", "point_count"],
                textSize: 12,
                textPitchAlignment: "map"
              }}
            />
            <Mapbox.CircleLayer
              id="unclustered-pins"
              filter={["!", ["has", "point_count"]]}
              style={{
                circleColor: ["coalesce", ["get", "chapterColor"], "#38bdf8"],
                circleOpacity: 0.95,
                circleRadius: zoomLevel < CLUSTER_BREAKPOINT ? 7 : 9,
                circleStrokeColor: "#f8fafc",
                circleStrokeWidth: 2
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
            Set `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` to render the Memory Map.
          </Text>
        </View>
      )}

      <View className="absolute left-4 right-4 top-14 gap-2">
        {locationMessage ? (
          <View className="self-start rounded-full border border-white/10 bg-stone-950/80 px-4 py-2">
            <Text className="text-xs font-medium text-stone-200">{locationMessage}</Text>
          </View>
        ) : null}

        {showOfflineBanner ? (
          <View className="self-start rounded-full border border-amber-400/30 bg-amber-500/15 px-4 py-2">
            <Text className="text-xs font-medium text-amber-100">
              Offline mode. Showing cached pins when available.
            </Text>
          </View>
        ) : null}

        {supabaseMissing ? (
          <View className="self-start rounded-full border border-rose-400/30 bg-rose-500/15 px-4 py-2">
            <Text className="text-xs font-medium text-rose-100">
              Supabase env is missing. Pins cannot be loaded yet.
            </Text>
          </View>
        ) : null}
      </View>

      {pinsQuery.isLoading ? (
        <View className="absolute right-4 top-14 rounded-full border border-white/10 bg-stone-950/80 px-4 py-3">
          <ActivityIndicator color="#38bdf8" />
        </View>
      ) : null}

      {noPinsInArea ? (
        <View className="absolute inset-x-0 bottom-32 items-center px-6">
          <View className="rounded-2xl border border-white/10 bg-stone-950/85 px-4 py-3">
            <Text className="text-center text-sm text-stone-200">
              No memories in this area yet. Long press anywhere to leave one.
            </Text>
          </View>
        </View>
      ) : null}

      {pinsQuery.error && !showOfflineBanner ? (
        <View className="absolute inset-x-0 bottom-32 items-center px-6">
          <View className="rounded-2xl border border-rose-400/30 bg-rose-500/15 px-4 py-3">
            <Text className="text-center text-sm text-rose-100">
              Couldn&apos;t load memories for this area. Pull around the map and try again.
            </Text>
          </View>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        className="absolute bottom-6 right-4 rounded-full border border-white/10 bg-stone-950/90 px-4 py-3"
        onPress={() => {
          cameraRef.current?.setCamera({
            centerCoordinate: [
              initialViewport.coordinates.longitude,
              initialViewport.coordinates.latitude
            ],
            zoomLevel: DEFAULT_ZOOM_LEVEL,
            animationDuration: 500
          });
        }}
      >
        <Text className="text-xs font-semibold uppercase tracking-[1.6px] text-stone-100">
          Recenter
        </Text>
      </Pressable>

      <MemoryPinBottomSheet
        errorMessage={pinDetailErrorMessage}
        isLoading={pinDetailQuery.isLoading}
        isOffline={showOfflineBanner}
        onClose={() => {
          setSelectedPinId(null);
        }}
        pin={pinDetailQuery.data ?? fallbackSelectedPin}
      />
    </View>
  );
}
