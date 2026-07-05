"use client";

import {
  fetchPublicDiscoverPins,
  type DiscoverPin,
  type DiscoverTimeFilter
} from "@imprint/api/discover";
import type { Coordinates } from "@imprint/types";
import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl, { type Map as MapboxMapInstance } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_DARK_STYLE, boundsFromMap } from "../../lib/map";
import { Spinner } from "../ui/Spinner";

const DEFAULT_CENTER: Coordinates = { latitude: 40.7128, longitude: -74.006 };
const RADIUS_METERS = 25_000;

export function DiscoverMapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMapInstance | null>(null);
  const [pins, setPins] = useState<DiscoverPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<DiscoverTimeFilter>("recent");
  const [withPhotos, setWithPhotos] = useState(false);
  const [center, setCenter] = useState(DEFAULT_CENTER);

  const loadPins = useCallback(
    async (mapCenter: Coordinates) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchPublicDiscoverPins({
          center: mapCenter,
          radiusMeters: RADIUS_METERS,
          timeFilter,
          withPhotos,
          limit: 20
        });
        setPins(result);
      } catch {
        setError("Couldn't load public memories. Try again?");
      } finally {
        setLoading(false);
      }
    },
    [timeFilter, withPhotos]
  );

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
    if (!containerRef.current || !token) {
      return;
    }

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_DARK_STYLE,
      center: [center.longitude, center.latitude],
      zoom: 11
    });

    map.on("moveend", () => {
      const bounds = boundsFromMap(map);
      const mapCenter = map.getCenter();
      const nextCenter = { latitude: mapCenter.lat, longitude: mapCenter.lng };
      setCenter(nextCenter);
      void loadPins(nextCenter);
    });

    mapRef.current = map;
    void loadPins(center);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center.latitude, center.longitude, loadPins]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) {
      return;
    }

    const sourceId = "discover-pins";
    const geojson = {
      type: "FeatureCollection" as const,
      features: pins.map((pin) => ({
        type: "Feature" as const,
        properties: { id: pin.id, title: pin.title, color: pin.chapter?.color ?? "#f97316" },
        geometry: {
          type: "Point" as const,
          coordinates: [pin.location.longitude, pin.location.latitude]
        }
      }))
    };

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, { type: "geojson", data: geojson });
      map.addLayer({
        id: "discover-pin-layer",
        type: "circle",
        source: sourceId,
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": 7,
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
  }, [pins]);

  useEffect(() => {
    void loadPins(center);
  }, [timeFilter, withPhotos, center, loadPins]);

  return (
    <div className="app-map-screen">
      <div ref={containerRef} className="app-map" aria-label="Discover map" />
      <div className="app-map-toolbar" style={{ flexDirection: "column", alignItems: "flex-start" }}>
        <select
          value={timeFilter}
          onChange={(event) => { setTimeFilter(event.target.value as DiscoverTimeFilter); }}
          className="app-map-tool"
          aria-label="Time filter"
        >
          <option value="recent">Recent</option>
          <option value="all-time">All time</option>
        </select>
        <label className="app-map-tool">
          <input
            type="checkbox"
            checked={withPhotos}
            onChange={(event) => { setWithPhotos(event.target.checked); }}
          />{" "}
          With photos
        </label>
      </div>
      {loading ? <Spinner label="Loading discovery…" /> : null}
      {error ? <div className="app-map-status">{error}</div> : null}
      {!loading && !error && pins.length === 0 ? (
        <div className="app-map-status">No public memories nearby yet.</div>
      ) : null}
    </div>
  );
}
