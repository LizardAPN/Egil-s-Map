"use client";

import { broadcastPresence, stopBroadcasting, subscribeToPresence } from "@imprint/api/presence";
import type { Coordinates, PresenceVisibility } from "@imprint/types";
import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl, { type Map as MapboxMapInstance } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { applyFuzzyOffset } from "../../lib/fuzzy";
import { MAPBOX_DARK_STYLE, flyToMap } from "../../lib/map";
import { Button } from "../ui/Button";

type SharingMode = "hidden" | PresenceVisibility;

interface LiveMarker {
  userId: string;
  coordinates: Coordinates;
  username: string;
  visibility: PresenceVisibility;
}

const DEFAULT_CENTER: Coordinates = { latitude: 40.7128, longitude: -74.006 };

function parsePresencePayload(payload: unknown): LiveMarker | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const newRecord = record.new as Record<string, unknown> | undefined;
  const row = newRecord ?? record;
  const userId = typeof row.user_id === "string" ? row.user_id : null;
  const visibility = row.visibility;
  if (!userId || (visibility !== "friends" && visibility !== "community")) {
    return null;
  }

  let latitude: number | null = null;
  let longitude: number | null = null;

  if (typeof row.latitude === "number" && typeof row.longitude === "number") {
    latitude = row.latitude;
    longitude = row.longitude;
  } else if (typeof row.location === "string") {
    const match = row.location.match(/POINT\((-?\d+(\.\d+)?) (-?\d+(\.\d+)?)\)/);
    if (match) {
      longitude = Number(match[1]);
      latitude = Number(match[3]);
    }
  }

  if (latitude === null || longitude === null) {
    return null;
  }

  const raw = { latitude, longitude };
  const coordinates = visibility === "friends" ? applyFuzzyOffset(raw) : raw;

  return {
    userId,
    coordinates,
    username: typeof row.username === "string" ? row.username : "Friend",
    visibility
  };
}

export function LiveMapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMapInstance | null>(null);
  const [mode, setMode] = useState<SharingMode>("hidden");
  const [audience, setAudience] = useState<PresenceVisibility>("friends");
  const [markers, setMarkers] = useState<LiveMarker[]>([]);
  const [myLocation, setMyLocation] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const syncMarkers = useCallback((nextMarkers: LiveMarker[]) => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) {
      return;
    }

    const sourceId = "live-presence";
    const geojson = {
      type: "FeatureCollection" as const,
      features: nextMarkers.map((marker) => ({
        type: "Feature" as const,
        properties: { username: marker.username },
        geometry: {
          type: "Point" as const,
          coordinates: [marker.coordinates.longitude, marker.coordinates.latitude]
        }
      }))
    };

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, { type: "geojson", data: geojson });
      map.addLayer({
        id: "live-presence-layer",
        type: "circle",
        source: sourceId,
        paint: {
          "circle-color": "#22c55e",
          "circle-radius": 8,
          "circle-stroke-color": "#f8fafc",
          "circle-stroke-width": 2
        }
      });
    } else {
      const source = map.getSource(sourceId);
      if (source && "setData" in source) {
        (source as mapboxgl.GeoJSONSource).setData(geojson);
      }
    }
  }, []);

  useEffect(() => {
    syncMarkers(markers);
  }, [markers, syncMarkers]);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
    if (!containerRef.current || !token) {
      return;
    }

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_DARK_STYLE,
      center: [DEFAULT_CENTER.longitude, DEFAULT_CENTER.latitude],
      zoom: 11
    });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const subscription = subscribeToPresence((payload) => {
      const marker = parsePresencePayload(payload);
      if (!marker) {
        return;
      }
      setMarkers((current) => {
        const without = current.filter((item) => item.userId !== marker.userId);
        return [...without, marker];
      });
    });

    return () => {
      void subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setMyLocation(coordinates);
        const map = mapRef.current;
        if (map && mode !== "hidden") {
          flyToMap(map, coordinates, 12);
        }
      },
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 15_000 }
    );

    return () => { navigator.geolocation.clearWatch(watchId); };
  }, [mode]);

  useEffect(() => {
    if (mode === "hidden" || !myLocation) {
      return;
    }

    const interval = window.setInterval(() => {
      void broadcastPresence({ location: myLocation, visibility: mode }).catch(() => {
        setStatus("Couldn't update your live location.");
      });
    }, 30_000);

    void broadcastPresence({ location: myLocation, visibility: mode });

    return () => { window.clearInterval(interval); };
  }, [mode, myLocation]);

  const handleToggle = async () => {
    if (mode !== "hidden") {
      await stopBroadcasting();
      setMode("hidden");
      setStatus("You're hidden.");
      return;
    }

    if (!myLocation) {
      setStatus("Enable location to go live.");
      return;
    }

    setMode(audience);
    setStatus(audience === "friends" ? "Friends can see you (fuzzy)." : "Community can see you.");
  };

  return (
    <div className="app-map-screen">
      <div ref={containerRef} className="app-map" aria-label="Live map" />
      <div className="app-map-toolbar" style={{ flexDirection: "column", alignItems: "flex-start" }}>
        <select
          value={audience}
          onChange={(event) => { setAudience(event.target.value as PresenceVisibility); }}
          className="app-map-tool"
          disabled={mode !== "hidden"}
          aria-label="Audience"
        >
          <option value="friends">Friends</option>
          <option value="community">Community</option>
        </select>
        <Button onClick={handleToggle}>{mode === "hidden" ? "Go live" : "Stop sharing"}</Button>
      </div>
      {status ? <div className="app-map-status">{status}</div> : null}
      {markers.length === 0 ? (
        <div className="app-map-status">No live friends nearby right now.</div>
      ) : null}
    </div>
  );
}
