"use client";

import { useRef, useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

declare global {
  interface Window {
    L: typeof L;
  }
}

declare module "leaflet" {
  function heatLayer(
    latlngs: [number, number, number?][],
    options?: { radius?: number; blur?: number; gradient?: Record<number, string> }
  ): L.Layer;
}

export default function MapCanvas({ token }: { token?: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = L.map(mapRef.current).setView([20, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);
    const markers = L.layerGroup().addTo(map);
    markersRef.current = markers;
    mapInstanceRef.current = map;
    setReady(true);
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    async function fetchData() {
      const b = map.getBounds();
      const minLat = b.getSouth();
      const maxLat = b.getNorth();
      const minLng = b.getWest();
      const maxLng = b.getEast();
      const params = `min_lat=${minLat}&max_lat=${maxLat}&min_lng=${minLng}&max_lng=${maxLng}`;
      try {
        const [heatRes, pinsRes] = await Promise.all([
          fetch(`${API_BASE}/map/heatmap?${params}`),
          fetch(`${API_BASE}/map/pins?${params}`),
        ]);
        const heatData = await heatRes.json();
        const pinsData = await pinsRes.json();

        const points: [number, number, number][] = (
          heatData as { lat: number; lng: number; intensity: number }[]
        ).map((p) => [p.lat, p.lng, p.intensity]);
        if (heatLayerRef.current) {
          map.removeLayer(heatLayerRef.current);
        }
        heatLayerRef.current = (L as { heatLayer: (p: [number, number, number][], o?: object) => L.Layer }).heatLayer(
          points,
          {
            radius: 25,
            blur: 15,
            gradient: { 0.4: "blue", 0.65: "lime", 1: "rgba(251, 191, 36, 0.8)" },
          }
        );
        heatLayerRef.current.addTo(map);

        if (markersRef.current) {
          markersRef.current.clearLayers();
          for (const pin of pinsData as { id: number; lat: number; lng: number; content_type: string; is_private: boolean }[]) {
            const icon = L.divIcon({
              className: "pin-marker",
              html: `<div class="w-4 h-4 rounded-full ${pin.is_private ? "bg-gray-500" : "bg-amber-500"} border-2 border-white"></div>`,
            });
            const m = L.marker([pin.lat, pin.lng], { icon }).addTo(markersRef.current);
            m.bindPopup(`<a href="/pins/${pin.id}">Pin #${pin.id}</a>`);
          }
        }
      } catch {
        // Empty
      }
    }

    fetchData();
    const handler = () => fetchData();
    map.on("moveend", handler);
    return () => map.off("moveend", handler);
  }, [ready]);

  return <div ref={mapRef} className="h-full w-full" />;
}
