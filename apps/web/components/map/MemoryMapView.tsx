"use client";

import type { MemoryPinMapItem } from "@imprint/api/browser";
import { useMemoryPinsInBounds } from "@imprint/api/browser";
import { fetchIpCityLocation } from "@imprint/api/browser";
import type { Coordinates } from "@imprint/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { boundsFromMap, CLUSTER_BREAKPOINT, flyToMap } from "../../lib/map";
import type { MapboxMapHandle } from "./MapboxMap";
import { useMemoryMapStore } from "../../store/memory-map-store";
import { MapBottomSheet } from "./MapBottomSheet";
import { MapboxMap } from "./MapboxMap";
import mapboxgl, { type Map as MapboxMapInstance } from "mapbox-gl";

const DEFAULT_CENTER: Coordinates = { latitude: 40.7128, longitude: -74.006 };

function pinsToGeoJson(pins: MemoryPinMapItem[]) {
  return {
    type: "FeatureCollection" as const,
    features: pins.map((pin) => ({
      type: "Feature" as const,
      properties: {
        id: pin.id,
        title: pin.title,
        chapterColor: pin.chapter?.color ?? "#38bdf8"
      },
      geometry: {
        type: "Point" as const,
        coordinates: [pin.location.longitude, pin.location.latitude]
      }
    }))
  };
}

export function MemoryMapView() {
  const router = useRouter();
  const mapRef = useRef<MapboxMapHandle>(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [bounds, setBounds] = useState<ReturnType<typeof boundsFromMap>>(null);
  const [offline, setOffline] = useState(false);
  const selectedPinId = useMemoryMapStore((state) => state.selectedPinId);
  const optimisticPins = useMemoryMapStore((state) => state.optimisticPins);
  const setSelectedPinId = useMemoryMapStore((state) => state.setSelectedPinId);
  const focusTarget = useMemoryMapStore((state) => state.focusTarget);
  const clearFocusTarget = useMemoryMapStore((state) => state.clearFocusTarget);

  const { data: pins = [], isLoading } = useMemoryPinsInBounds({
    bounds: bounds ?? {
      northEast: { latitude: center.latitude + 0.2, longitude: center.longitude + 0.2 },
      southWest: { latitude: center.latitude - 0.2, longitude: center.longitude - 0.2 }
    },
    enabled: bounds !== null
  });

  const mergedPins = useMemo(() => {
    const byId = new Map<string, MemoryPinMapItem>();
    for (const pin of [...optimisticPins, ...pins]) {
      byId.set(pin.id, pin);
    }
    return [...byId.values()];
  }, [optimisticPins, pins]);

  const selectedPin = mergedPins.find((pin) => pin.id === selectedPinId) ?? null;

  useEffect(() => {
    const updateOnline = () => { setOffline(!navigator.onLine); };
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      void fetchIpCityLocation()
        .then((result) => { setCenter(result.coordinates); })
        .catch(() => undefined);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      () => {
        void fetchIpCityLocation()
          .then((result) => { setCenter(result.coordinates); })
          .catch(() => undefined);
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    if (!focusTarget) {
      return;
    }

    const map = mapRef.current?.getMap();
    if (map) {
      flyToMap(map, focusTarget.coordinates, 14);
    }
    clearFocusTarget();
  }, [focusTarget, clearFocusTarget]);

  const syncPinsLayer = useCallback(
    (map: MapboxMapInstance) => {
      const sourceId = "memory-pins";
      const clusterLayerId = "memory-clusters";
      const clusterCountLayerId = "memory-cluster-count";
      const pinLayerId = "memory-pin-points";

      const geojson = pinsToGeoJson(mergedPins);

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: "geojson",
          data: geojson,
          cluster: true,
          clusterMaxZoom: CLUSTER_BREAKPOINT - 1,
          clusterRadius: 50
        });

        map.addLayer({
          id: clusterLayerId,
          type: "circle",
          source: sourceId,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#38bdf8",
            "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 30, 28],
            "circle-opacity": 0.85
          }
        });

        map.addLayer({
          id: clusterCountLayerId,
          type: "symbol",
          source: sourceId,
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": 12
          },
          paint: { "text-color": "#020617" }
        });

        map.addLayer({
          id: pinLayerId,
          type: "circle",
          source: sourceId,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": ["get", "chapterColor"],
            "circle-radius": 8,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#f8fafc"
          }
        });

        map.on("click", clusterLayerId, (event) => {
          const feature = event.features?.[0];
          if (!feature) {
            return;
          }
          const geometry = feature.geometry;
          if (geometry.type !== "Point") {
            return;
          }
          const clusterId = feature.properties?.cluster_id;
          const source = map.getSource(sourceId);
          if (!source || !("getClusterExpansionZoom" in source) || typeof clusterId !== "number") {
            return;
          }
          (source as mapboxgl.GeoJSONSource).getClusterExpansionZoom(clusterId, (error, nextZoom) => {
            if (error || nextZoom === null || nextZoom === undefined) {
              return;
            }
            const coords = geometry.coordinates;
            if (coords.length < 2 || typeof coords[0] !== "number" || typeof coords[1] !== "number") {
              return;
            }
            map.easeTo({ center: [coords[0], coords[1]], zoom: nextZoom });
          });
        });

        map.on("click", pinLayerId, (event) => {
          const feature = event.features?.[0];
          const pinId = feature?.properties?.id;
          if (typeof pinId === "string") {
            setSelectedPinId(pinId);
          }
        });

        map.on("mouseenter", clusterLayerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", clusterLayerId, () => {
          map.getCanvas().style.cursor = "";
        });
        map.on("mouseenter", pinLayerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", pinLayerId, () => {
          map.getCanvas().style.cursor = "";
        });
      } else {
        const source = map.getSource(sourceId);
        if (source && "setData" in source) {
          (source as mapboxgl.GeoJSONSource).setData(geojson);
        }
      }
    },
    [mergedPins, setSelectedPinId]
  );

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (map?.isStyleLoaded()) {
      syncPinsLayer(map);
    }
  }, [mergedPins, syncPinsLayer]);

  const handleMapLoad = useCallback(
    (map: MapboxMapInstance) => {
      setBounds(boundsFromMap(map));
      syncPinsLayer(map);
    },
    [syncPinsLayer]
  );

  const handleMoveEnd = useCallback((map: MapboxMapInstance) => {
    setBounds(boundsFromMap(map));
  }, []);

  const handleDropPin = () => {
    const map = mapRef.current?.getMap();
    const centerCoords = map?.getCenter();
    const lat = centerCoords?.lat ?? center.latitude;
    const lng = centerCoords?.lng ?? center.longitude;
    router.push(`/create-pin?lat=${lat}&lng=${lng}`);
  };

  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
      const coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      setCenter(coordinates);
      const map = mapRef.current?.getMap();
      if (map) {
        flyToMap(map, coordinates, 13);
      }
    });
  };

  return (
    <div className="app-map-screen">
      {offline ? <div className="app-offline-banner">You&apos;re offline. Changes may not sync.</div> : null}
      <MapboxMap
        ref={mapRef}
        initialCenter={center}
        initialZoom={11}
        onLoad={handleMapLoad}
        onMoveEnd={handleMoveEnd}
        onContextMenu={(coordinates) => {
          router.push(`/create-pin?lat=${coordinates.latitude}&lng=${coordinates.longitude}`);
        }}
      />
      <div className="app-map-toolbar">
        <button type="button" className="app-map-tool" onClick={handleMyLocation}>
          My location
        </button>
        <button type="button" className="app-map-tool app-map-tool-primary" onClick={handleDropPin}>
          Drop pin
        </button>
      </div>
      {isLoading ? <div className="app-map-status">Loading memories…</div> : null}
      {!isLoading && mergedPins.length === 0 ? (
        <div className="app-map-status">No memories in this area yet. Drop your first pin.</div>
      ) : null}
      <MapBottomSheet pin={selectedPin} onClose={() => { setSelectedPinId(null); }} />
    </div>
  );
}
