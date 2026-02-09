"use client";

import { useRef, useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const PARCHMENT_BASE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Crect fill='%23e8d5b7' width='256' height='256'/%3E%3C/svg%3E";
const CARTO_BASE =
  "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png";

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
      maxBounds: [
        [-90, -180],
        [90, 180],
      ],
      maxBoundsViscosity: 1.0,
      minZoom: 2.5,
      worldCopyJump: false,
    });

    // Living Parchment layers
    L.tileLayer(PARCHMENT_BASE, { attribution: "", noWrap: true, minZoom: 0, maxZoom: 22 }).addTo(map);
    L.tileLayer(CARTO_BASE, {
      attribution: "© OpenStreetMap contributors © CARTO",
      noWrap: true,
      opacity: 0.85,
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
      map.off("click", handleClick);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      setPicked(null);
    };
  }, [open, initialLat, initialLng]);

  function handleConfirm() {
    if (picked) {
      onPick(picked.lat, picked.lng);
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-[90vw] max-w-2xl h-[70vh] torn-paper-clip overflow-hidden shadow-2xl map-picker-cursor">
        <div
          ref={mapRef}
          className="w-full h-full map-medieval-theme"
        />
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-4 torn-paper-clip px-4 py-3">
          <p className="text-sm text-gray-300 font-special-elite">
            {picked
              ? `Selected: ${picked.lat.toFixed(4)}, ${picked.lng.toFixed(4)}`
              : "Click on the map to pick a location"}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 torn-paper-clip bg-gray-700 text-gray-300 font-cinzel hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!picked}
              className="px-4 py-2 torn-paper-clip bg-amber-500 text-gray-900 font-cinzel font-medium hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
