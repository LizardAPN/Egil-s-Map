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
    
    let map: L.Map | null = null;
    let timer: NodeJS.Timeout | null = null;
    
    function initializeMap() {
      if (!mapRef.current) return;
      
      map = L.map(mapRef.current, {
        zoomControl: true,
      }).setView([20, 0], 2);
      
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);
      
      const markers = L.layerGroup().addTo(map);
      markersRef.current = markers;
      mapInstanceRef.current = map;
      
      // Invalidate size to ensure Leaflet recalculates container dimensions
      setTimeout(() => {
        if (map) {
          map.invalidateSize();
        }
      }, 0);
      
      // Wait for map to be fully ready before setting ready state
      map.whenReady(() => {
        setReady(true);
      });
    }
    
    // Ensure container has dimensions before initializing
    if (mapRef.current.offsetWidth === 0 || mapRef.current.offsetHeight === 0) {
      // Wait for next frame to ensure container is sized
      timer = setTimeout(() => {
        if (mapRef.current && (mapRef.current.offsetWidth > 0 && mapRef.current.offsetHeight > 0)) {
          initializeMap();
        }
      }, 0);
    } else {
      initializeMap();
    }
    
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      if (map) {
        map.remove();
      }
      mapInstanceRef.current = null;
      markersRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    async function fetchData() {
      if (!mapInstanceRef.current) return;
      
      try {
        // Ensure map container is still valid
        const container = mapInstanceRef.current.getContainer();
        if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) {
          return;
        }
        
        const b = mapInstanceRef.current.getBounds();
        const minLat = b.getSouth();
        const maxLat = b.getNorth();
        const minLng = b.getWest();
        const maxLng = b.getEast();
        const params = `min_lat=${minLat}&max_lat=${maxLat}&min_lng=${minLng}&max_lng=${maxLng}`;
        
        const [heatRes, pinsRes] = await Promise.all([
          fetch(`${API_BASE}/map/heatmap?${params}`),
          fetch(`${API_BASE}/map/pins?${params}`),
        ]);
        const heatData = await heatRes.json();
        const pinsData = await pinsRes.json();

        if (!mapInstanceRef.current) return;

        const points: [number, number, number][] = (
          heatData as { lat: number; lng: number; intensity: number }[]
        ).map((p) => [p.lat, p.lng, p.intensity]);
        
        if (heatLayerRef.current && mapInstanceRef.current.hasLayer(heatLayerRef.current)) {
          mapInstanceRef.current.removeLayer(heatLayerRef.current);
        }
        
        heatLayerRef.current = (L as { heatLayer: (p: [number, number, number][], o?: object) => L.Layer }).heatLayer(
          points,
          {
            radius: 25,
            blur: 15,
            gradient: { 0.4: "blue", 0.65: "lime", 1: "rgba(251, 191, 36, 0.8)" },
          }
        );
        heatLayerRef.current.addTo(mapInstanceRef.current);

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

    // Small delay to ensure map is fully rendered
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 100);
    
    const handler = () => {
      if (mapInstanceRef.current) {
        fetchData();
      }
    };
    
    map.on("moveend", handler);
    map.on("zoomend", handler);
    
    return () => {
      clearTimeout(timeoutId);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off("moveend", handler);
        mapInstanceRef.current.off("zoomend", handler);
      }
    };
  }, [ready]);

  return <div ref={mapRef} className="h-full w-full" />;
}
