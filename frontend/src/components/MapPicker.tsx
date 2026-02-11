"use client";

import { useRef, useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const OSM_BASE = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const STAMEN_LABELS =
  "https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}{r}.png";

type MapPickerProps = {
  open: boolean;
  onClose: () => void;
  onPick: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
};

/* Wax Seal (Surguch) marker for selected point */
const waxSealIconSvg = `
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4))">
    <circle cx="16" cy="16" r="14" fill="#8B4513" stroke="#5D3A1A" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="4" fill="#5D3A1A" opacity="0.8"/>
  </svg>
`;

export default function MapPicker({
  open,
  onClose,
  onPick,
  initialLat = 55.75,
  initialLng = 37.62,
}: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!open || !mapRef.current) return;

    const map = L.map(mapRef.current, {
      center: [initialLat, initialLng],
      zoom: 4,
      attributionControl: false,
      maxBounds: [
        [-90, -180],
        [90, 180],
      ],
      maxBoundsViscosity: 1.0,
      minZoom: 2.5,
      worldCopyJump: false,
    });

    // OpenStreetMap base layer (CSS filter applied via .leaflet-container)
    L.tileLayer(OSM_BASE, {
      attribution: "",
      noWrap: true,
      minZoom: 0,
      maxZoom: 19,
    }).addTo(map);
    
    // Labels layer: Stamen Toner Labels - single clean label per place, no duplicates
    L.tileLayer(STAMEN_LABELS, {
      attribution: "",
      noWrap: true,
      className: "map-labels-layer",
      subdomains: "abcd",
    }).addTo(map);

    const waxSealIcon = L.divIcon({
      className: "ghost-marker wax-seal-picker-marker",
      html: waxSealIconSvg,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    function handleClick(e: L.LeafletMouseEvent) {
      const { lat, lng } = e.latlng;
      if (markerRef.current) map.removeLayer(markerRef.current);
      const marker = L.marker([lat, lng], { icon: waxSealIcon }).addTo(map);
      markerRef.current = marker;
      setPicked({ lat, lng });
    }

    map.on("click", handleClick);
    mapInstanceRef.current = map;

    return () => {
      const m = mapInstanceRef.current;
      if (m) {
        m.off("click", handleClick);
        try {
          m.remove();
        } catch {
          // Container may already be unmounted by React
        }
        mapInstanceRef.current = null;
        markerRef.current = null;
        setPicked(null);
      }
    };
  }, [open, initialLat, initialLng]);

  function closePicker() {
    const m = mapInstanceRef.current;
    if (m) {
      m.off("click");
      try {
        m.remove();
      } catch {
        // Ignore cleanup errors
      }
      mapInstanceRef.current = null;
      markerRef.current = null;
      setPicked(null);
    }
    onClose();
  }

  function handleConfirm() {
    if (picked) {
      onPick(picked.lat, picked.lng);
      closePicker();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && closePicker()}
    >
      <div
        className="relative w-[90vw] max-w-2xl h-[70vh] torn-paper-clip overflow-hidden shadow-2xl map-picker-cursor flex flex-col bg-[#1a1a1e]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={mapRef}
          className="flex-1 min-h-0 w-full map-medieval-theme"
        />
        <div className="flex-shrink-0 flex items-center justify-between gap-4 torn-paper-clip px-4 py-3 border-t border-gray-700">
          <p className="text-sm text-gray-300 font-special-elite">
            {picked
              ? `Selected: ${picked.lat.toFixed(4)}, ${picked.lng.toFixed(4)} — click “Use this location” to save`
              : "Click on the map to pick a location"}
          </p>
          <div className="flex gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={closePicker}
              className="px-4 py-2 bg-gray-600 text-gray-200 font-cinzel hover:bg-gray-500 rounded"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!picked}
              className="px-4 py-2 bg-[#d4af37] text-gray-900 font-cinzel font-medium hover:bg-[#b8860b] hover:brightness-110 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Use this location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
