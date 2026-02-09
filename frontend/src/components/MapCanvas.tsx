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

/* OpenStreetMap base layer URL */
const OSM_BASE = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export default function MapCanvas({ token }: { token?: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const strongholdMarkersRef = useRef<L.LayerGroup | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;
    
    let map: L.Map | null = null;
    let timer: NodeJS.Timeout | null = null;
    
    function initializeMap() {
      if (!mapRef.current) return;
      
      map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false,
        maxBounds: [
          [-90, -180],
          [90, 180],
        ],
        maxBoundsViscosity: 1.0,
        minZoom: 2.5,
        worldCopyJump: false,
      }).setView([20, 0], 2);

      // 1. Base: OpenStreetMap tiles (CSS filter applied via .leaflet-container)
      L.tileLayer(OSM_BASE, {
        attribution: "",
        noWrap: true,
        minZoom: 0,
        maxZoom: 19,
      }).addTo(map);
      
      // 2. Labels layer: Stamen Toner Labels - single clean label per place, no duplicates
      const labelsLayer = L.tileLayer(
        "https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}{r}.png",
        {
          attribution: "",
          noWrap: true,
          className: "map-labels-layer",
          subdomains: "abcd",
        }
      );
      labelsLayer.addTo(map);
      labelsLayerRef.current = labelsLayer;
      
      const markers = L.layerGroup().addTo(map);
      markersRef.current = markers;
      const strongholdMarkers = L.layerGroup().addTo(map);
      strongholdMarkersRef.current = strongholdMarkers;
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
        map.off("zoomend");
        map.remove();
      }
      mapInstanceRef.current = null;
      markersRef.current = null;
      strongholdMarkersRef.current = null;
      labelsLayerRef.current = null;
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
        
        const [heatRes, pinsRes, strongholdsRes] = await Promise.all([
          fetch(`${API_BASE}/map/heatmap?${params}`),
          fetch(`${API_BASE}/map/pins?${params}`),
          fetch(`${API_BASE}/map/strongholds?${params}`),
        ]);
        const heatData = await heatRes.json();
        const pinsData = await pinsRes.json();
        const strongholdsData = await strongholdsRes.json();

        if (!mapInstanceRef.current) return;

        const points: [number, number, number][] = (
          heatData as { lat: number; lng: number; intensity: number }[]
        ).map((p) => [p.lat, p.lng, p.intensity]);
        
        if (heatLayerRef.current && mapInstanceRef.current.hasLayer(heatLayerRef.current)) {
          mapInstanceRef.current.removeLayer(heatLayerRef.current);
        }
        
        // Golden Glow: transparent -> gold -> orange-fire (light shining through paper)
        heatLayerRef.current = (L as { heatLayer: (p: [number, number, number][], o?: object) => L.Layer }).heatLayer(
          points,
          {
            radius: 25,
            blur: 15,
            gradient: { 
              0: "rgba(255, 215, 0, 0)",      // transparent
              0.5: "rgba(255, 215, 0, 0.5)",  // gold #FFD700
              1: "rgba(255, 140, 0, 0.9)",    // orange-fire #FF8C00
            },
          }
        );
        heatLayerRef.current.addTo(mapInstanceRef.current);
        
        // Apply blend mode for "glowing from under paper" effect
        setTimeout(() => {
          const heatCanvas = (heatLayerRef.current as any)?._canvas;
          if (heatCanvas) {
            heatCanvas.style.mixBlendMode = "multiply";
          }
        }, 100);

        if (markersRef.current) {
          markersRef.current.clearLayers();
          for (const pin of pinsData as { id: number; lat: number; lng: number; content_type: string; is_private: boolean; is_echo?: boolean }[]) {
            // Guardian Incognito: locked/private pins appear as faint Mist
            const isMist = pin.is_private || pin.is_echo;
            const iconSvgString = `
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" fill="${isMist ? "rgba(180,180,200,0.4)" : "#8B4513"}" stroke="${isMist ? "rgba(120,120,140,0.5)" : "#5D3A1A"}" stroke-width="1.5"/>
                ${pin.is_private ? `
                  <line x1="16" y1="8" x2="16" y2="24" stroke="${isMist ? "rgba(120,120,140,0.5)" : "#5D3A1A"}" stroke-width="2" stroke-linecap="round"/>
                  <line x1="8" y1="16" x2="24" y2="16" stroke="${isMist ? "rgba(120,120,140,0.5)" : "#5D3A1A"}" stroke-width="2" stroke-linecap="round"/>
                  <circle cx="16" cy="16" r="2" fill="${isMist ? "rgba(120,120,140,0.6)" : "#5D3A1A"}" opacity="0.6"/>
                ` : `
                  <circle cx="16" cy="16" r="4" fill="${isMist ? "rgba(120,120,140,0.8)" : "#5D3A1A"}" opacity="0.8"/>
                `}
              </svg>
            `;
            const icon = L.divIcon({
              className: `pin-marker wax-seal-marker ${isMist ? "guardian-mist" : ""}`,
              html: iconSvgString,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            });
            const m = L.marker([pin.lat, pin.lng], { icon }).addTo(markersRef.current);
            m.bindPopup(`<a href="/pins/${pin.id}">Pin #${pin.id}</a>`);
          }
        }

        // Stronghold markers - castle/fortress icon, size by brightness
        if (strongholdMarkersRef.current) {
          strongholdMarkersRef.current.clearLayers();
          for (const sh of strongholdsData as { id: number; name: string; lat: number; lng: number; brightness: number }[]) {
            const size = Math.min(40, Math.max(24, 24 + Math.floor(sh.brightness / 50) * 4));
            const iconSvgString = `
              <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2 L14 4 L14 8 L16 8 L16 12 L18 12 L18 20 L6 20 L6 12 L8 12 L8 8 L10 8 L10 4 Z" stroke="#8B4513" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="rgba(139,69,19,0.2)"/>
                <path d="M6 20 L6 18 M8 20 L8 18 M10 20 L10 18 M12 20 L12 18 M14 20 L14 18 M16 20 L16 18 M18 20 L18 18" stroke="#5D3A1A" stroke-width="1.5" stroke-linecap="round"/>
                <rect x="10" y="16" width="4" height="4" stroke="#5D3A1A" stroke-width="1" fill="rgba(212,175,55,0.3)"/>
              </svg>
            `;
            const icon = L.divIcon({
              className: "stronghold-marker",
              html: iconSvgString,
              iconSize: [size, size],
              iconAnchor: [size / 2, size],
            });
            const m = L.marker([sh.lat, sh.lng], { icon }).addTo(strongholdMarkersRef.current);
            m.bindPopup(`<a href="/strongholds/${sh.id}" class="font-cinzel">${sh.name}</a><br/><span class="text-gray-500 text-sm">Brightness: ${sh.brightness}</span>`);
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

  return (
    <div
      ref={mapRef}
      className="h-full w-full map-medieval-theme"
    />
  );
}
