"use client";

import mapboxgl, { type Map as MapboxMapInstance } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { MAPBOX_DARK_STYLE } from "../../lib/map";
import type { Coordinates } from "@imprint/types";

export interface MapboxMapHandle {
  getMap: () => MapboxMapInstance | null;
}

interface MapboxMapProps {
  initialCenter: Coordinates;
  initialZoom?: number;
  className?: string;
  onLoad?: (map: MapboxMapInstance) => void;
  onMoveEnd?: (map: MapboxMapInstance) => void;
  onContextMenu?: (coordinates: Coordinates) => void;
}

export const MapboxMap = forwardRef<MapboxMapHandle, MapboxMapProps>(function MapboxMap(
  { initialCenter, initialZoom = 11, className = "", onLoad, onMoveEnd, onContextMenu },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMapInstance | null>(null);

  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current
  }));

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
    if (!containerRef.current || !token) {
      return;
    }

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_DARK_STYLE,
      center: [initialCenter.longitude, initialCenter.latitude],
      zoom: initialZoom,
      attributionControl: true
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new mapboxgl.GeolocateControl({ trackUserLocation: false }), "top-right");

    map.on("load", () => {
      onLoad?.(map);
    });

    map.on("moveend", () => {
      onMoveEnd?.(map);
    });

    map.on("contextmenu", (event) => {
      event.preventDefault();
      onContextMenu?.({
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [initialCenter.latitude, initialCenter.longitude, initialZoom, onContextMenu, onLoad, onMoveEnd]);

  if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
    return (
      <div className={`app-map-fallback ${className}`.trim()}>
        <p>Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to show the map.</p>
      </div>
    );
  }

  return <div ref={containerRef} className={`app-map ${className}`.trim()} role="application" aria-label="Map" />;
});
