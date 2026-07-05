"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

import type { PinLocation } from "@imprint/types";

const DEFAULT_STYLE = "mapbox://styles/mapbox/dark-v11";
const MAP_CENTER: [number, number] = [0, 20];
const MAP_ZOOM = 1.5;

function getMapboxToken(): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token) {
    throw new Error(
      "NEXT_PUBLIC_MAPBOX_TOKEN is not set. Add it to apps/web/.env.local",
    );
  }

  return token;
}

function getMapboxStyle(): string {
  return process.env.NEXT_PUBLIC_MAPBOX_STYLE ?? DEFAULT_STYLE;
}

function createMarkerElement(): HTMLDivElement {
  const element = document.createElement("div");
  element.style.width = "16px";
  element.style.height = "16px";
  element.style.display = "block";
  element.style.borderRadius = "50%";
  element.style.backgroundColor = "#EFB65A";
  element.style.border = "2px solid #0C1226";
  element.style.boxShadow = "0 0 0 4px rgba(239, 182, 90, 0.35)";
  element.style.pointerEvents = "none";
  return element;
}

export function OnboardingMiniMap({
  location,
  onLocationChange,
}: {
  location: PinLocation | null;
  onLocationChange: (location: PinLocation) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onLocationChangeRef = useRef(onLocationChange);
  const locationRef = useRef(location);

  onLocationChangeRef.current = onLocationChange;
  locationRef.current = location;

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    // Exception to persistent-map rule — see docs/ARCHITECTURE.md §5
    mapboxgl.accessToken = getMapboxToken();

    const map = new mapboxgl.Map({
      container,
      style: getMapboxStyle(),
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      attributionControl: false,
    });

    mapRef.current = map;

    const marker = new mapboxgl.Marker({
      element: createMarkerElement(),
      anchor: "center",
    });
    markerRef.current = marker;

    const placeMarker = (nextLocation: PinLocation) => {
      marker.setLngLat([nextLocation.lng, nextLocation.lat]).addTo(map);
    };

    const handleClick = (event: mapboxgl.MapMouseEvent) => {
      const nextLocation = { lng: event.lngLat.lng, lat: event.lngLat.lat };
      placeMarker(nextLocation);
      onLocationChangeRef.current(nextLocation);
    };

    const bindMap = () => {
      map.resize();
      map.on("click", handleClick);

      if (locationRef.current) {
        placeMarker(locationRef.current);
      }
    };

    if (map.isStyleLoaded()) {
      bindMap();
    } else {
      map.once("load", bindMap);
    }

    return () => {
      map.off("click", handleClick);
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;

    if (!map || !marker || !location || !map.isStyleLoaded()) {
      return;
    }

    marker.setLngLat([location.lng, location.lat]).addTo(map);
  }, [location]);

  return (
    <div
      ref={containerRef}
      className="h-[260px] w-full cursor-crosshair overflow-hidden rounded-card border border-line"
      aria-label="Выбери место на карте"
    />
  );
}
