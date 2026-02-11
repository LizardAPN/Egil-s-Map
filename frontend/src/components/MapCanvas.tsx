"use client";

import { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { getCampfirePinDivIcon } from "./icons/CampfirePinIcon";
import { getRomanNumeralDivIcon, toRoman } from "./icons/RomanNumeralIcon";
import { formatChapterDateRange } from "@/lib/date-utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type PinRecord = {
  id: number;
  tier_id: number;
  tier_title: string;
  lat: number;
  lng: number;
  content_type: string;
  is_private: boolean;
  is_echo?: boolean;
  created_at: string | null;
};

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

/* OpenStreetMap base layer URL (fallback when MapTiler key not set) */
const OSM_BASE = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY || "";

/** Map locale to MapTiler language (en/ru supported for label translation) */
function localeToMaptilerLanguage(locale: string): string {
  if (locale === "ru") return "ru";
  return "en";
}

type MapCanvasProps = { token?: string; locale?: string };
export default function MapCanvas({ token, locale = "en" }: MapCanvasProps) {
  const { t } = useTranslation("common");
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const strongholdMarkersRef = useRef<L.LayerGroup | null>(null);
  const campfireMarkersRef = useRef<L.LayerGroup | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const maptilerLayerRef = useRef<{ setLanguage: (lang: string) => void } | null>(null);
  const [ready, setReady] = useState(false);
  const [pinsData, setPinsData] = useState<PinRecord[]>([]);
  const [chaptersData, setChaptersData] = useState<{
    tier_id: number;
    tier_title: string;
    lat: number;
    lng: number;
    is_active?: boolean;
    started_at?: string | null;
    ended_at?: string | null;
  }[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    
    let map: L.Map | null = null;
    let timer: NodeJS.Timeout | null = null;
    let cancelled = false;

    async function initializeMap() {
      const container = mapRef.current;
      if (!container || cancelled || !document.body.contains(container)) return;
      
      map = L.map(container, {
        zoomControl: true,
        attributionControl: !!MAPTILER_KEY,
        maxBounds: [
          [-90, -180],
          [90, 180],
        ],
        maxBoundsViscosity: 1.0,
        minZoom: 2.5,
        worldCopyJump: false,
      }).setView([20, 0], 2);

      const mapLanguage = localeToMaptilerLanguage(locale);

      function addOsmFallback() {
        if (!map || cancelled) return;
        const container = map.getContainer();
        if (!container || !document.body.contains(container)) return;
        L.tileLayer(OSM_BASE, {
          attribution: "",
          noWrap: true,
          minZoom: 0,
          maxZoom: 19,
        }).addTo(map!);
        const labelsLayer = L.tileLayer(
          "https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}{r}.png",
          {
            attribution: "",
            noWrap: true,
            className: "map-labels-layer",
            subdomains: "abcd",
          }
        );
        labelsLayer.addTo(map!);
        labelsLayerRef.current = labelsLayer;
      }
      
      if (MAPTILER_KEY) {
        try {
          if (cancelled || !map) return;
          const leafletmaptilersdk = await import("@maptiler/leaflet-maptilersdk");
          if (cancelled || !map) return;
          const { MaptilerLayer, MapStyle, Language } = leafletmaptilersdk;
          const mtLang = mapLanguage === "ru" ? Language.RUSSIAN : Language.ENGLISH;
          const mtLayer = new MaptilerLayer({
            apiKey: MAPTILER_KEY,
            style: MapStyle.BASIC.LIGHT,
            language: mtLang,
          });
          map.whenReady(() => {
            if (!map || cancelled) return;
            mtLayer.addTo(map);
            maptilerLayerRef.current = mtLayer;
          });
        } catch (err) {
          console.warn("MapTiler failed, using OSM fallback:", err);
          addOsmFallback();
        }
      } else {
        addOsmFallback();
      }
      
      if (cancelled || !map) return;
      const markers = L.layerGroup().addTo(map);
      markersRef.current = markers;
      const strongholdMarkers = L.layerGroup().addTo(map);
      strongholdMarkersRef.current = strongholdMarkers;
      const campfireMarkers = L.layerGroup().addTo(map);
      campfireMarkersRef.current = campfireMarkers;
      mapInstanceRef.current = map;
      
      // Invalidate size to ensure Leaflet recalculates container dimensions
      setTimeout(() => {
        if (map) {
          map.invalidateSize();
        }
      }, 0);
      
      // Wait for map to be fully ready before setting ready state
      map.whenReady(() => {
        if (!map || cancelled) return;
        setReady(true);
        map.on("click", () => setSelectedChapterId(null));
      });
    }
    
    // Ensure container has dimensions before initializing
    if (mapRef.current.offsetWidth === 0 || mapRef.current.offsetHeight === 0) {
      // Wait for next frame to ensure container is sized
      timer = setTimeout(() => {
        if (!cancelled && mapRef.current && document.body.contains(mapRef.current) && mapRef.current.offsetWidth > 0 && mapRef.current.offsetHeight > 0) {
          initializeMap();
        }
      }, 0);
    } else {
      initializeMap();
    }
    
    return () => {
      cancelled = true;
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
      campfireMarkersRef.current = null;
      labelsLayerRef.current = null;
      maptilerLayerRef.current = null;
      setReady(false);
    };
  }, []);

  // Update MapTiler language when locale changes (no re-init)
  useEffect(() => {
    const mt = maptilerLayerRef.current;
    if (mt && MAPTILER_KEY) {
      const lang = localeToMaptilerLanguage(locale);
      mt.setLanguage(lang);
    }
  }, [locale]);

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
        const params = `min_lat=${minLat}&max_lat=${maxLat}&min_lng=${minLng}&max_lng=${maxLng}&locale=${encodeURIComponent(locale)}`;
        const headers: HeadersInit = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const [heatRes, pinsRes, strongholdsRes, chaptersRes] = await Promise.all([
          fetch(`${API_BASE}/map/heatmap?${params}`, { headers }),
          fetch(`${API_BASE}/map/pins?${params}`, { headers }),
          fetch(`${API_BASE}/map/strongholds?${params}`),
          fetch(`${API_BASE}/map/chapters?${params}`, { headers }),
        ]);
        const heatData = await heatRes.json();
        const pinsRaw = await pinsRes.json();
        const strongholdsData = await strongholdsRes.json();
        const chaptersRaw = await chaptersRes.json();

        if (!mapInstanceRef.current) return;

        setPinsData((pinsRaw as PinRecord[]) || []);
        setChaptersData(
          (chaptersRaw as {
            tier_id: number;
            tier_title: string;
            lat: number;
            lng: number;
            is_active?: boolean;
            started_at?: string | null;
            ended_at?: string | null;
          }[]) || []
        );

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
  }, [ready, token, locale]);

  // Draw chapter bonfires (from API) and (when a chapter is selected) Roman numeral pin markers
  useEffect(() => {
    if (!ready || !mapInstanceRef.current || !campfireMarkersRef.current || !markersRef.current) return;
    const campfires = campfireMarkersRef.current;
    const pinsLayer = markersRef.current;
    campfires.clearLayers();
    pinsLayer.clearLayers();

    for (const ch of chaptersData) {
      const active = ch.is_active !== false; // default true for backward compat
      const icon = getCampfirePinDivIcon({ active, size: 44 });
      const m = L.marker([ch.lat, ch.lng], { icon }).addTo(campfires);
      const dateRange = formatChapterDateRange(ch.started_at, ch.ended_at, locale, t("map.present"));
      m.bindPopup(
        `<span class="font-cinzel">${escapeHtml(ch.tier_title)}</span>` +
          (dateRange ? `<br/><small class="text-gray-500">${escapeHtml(dateRange)}</small>` : "") +
          `<br/><small class="text-gray-500">Click to see events</small>`
      );
      m.on("click", () => setSelectedChapterId(ch.tier_id));
    }

    if (selectedChapterId !== null) {
      const chapterPins = pinsData
        .filter((p) => p.tier_id === selectedChapterId)
        .sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
      const chapterTitle = chapterPins[0]?.tier_title ?? "Chapter";
      chapterPins.forEach((pin, index) => {
        const roman = toRoman(index + 1);
        const icon = getRomanNumeralDivIcon(roman, 28);
        const marker = L.marker([pin.lat, pin.lng], { icon }).addTo(pinsLayer);
        marker.bindPopup(
          `<a href="/pins/${pin.id}" class="font-cinzel">${escapeHtml(chapterTitle)} — ${roman}</a>`
        );
      });
    }
  }, [ready, chaptersData, pinsData, selectedChapterId, locale, t]);

  return (
    <div
      ref={mapRef}
      className="h-full w-full map-medieval-theme"
    />
  );
}
