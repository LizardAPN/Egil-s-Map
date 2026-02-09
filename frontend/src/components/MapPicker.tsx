"use client";

import { useRef, useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const ESRI_IMAGERY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

type MapPickerProps = {
  open: boolean;
  onClose: () => void;
  onPick: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
};

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

    L.tileLayer(ESRI_IMAGERY, {
      attribution: "© Esri",
      noWrap: true,
    }).addTo(map);

    const ghostIcon = L.divIcon({
      className: "ghost-marker",
      html: `<div class="w-5 h-5 rounded-full bg-amber-400/70 border-2 border-amber-300 shadow-lg"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    function handleClick(e: L.LeafletMouseEvent) {
      const { lat, lng } = e.latlng;
      if (markerRef.current) map.removeLayer(markerRef.current);
      const marker = L.marker([lat, lng], { icon: ghostIcon }).addTo(map);
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
      <div className="relative w-[90vw] max-w-2xl h-[70vh] rounded-xl overflow-hidden bg-gray-900 border border-gray-700 shadow-2xl">
        <div
          ref={mapRef}
          className="w-full h-full map-cyber-theme"
        />
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-4 bg-gray-900/90 backdrop-blur px-4 py-3 rounded-lg border border-gray-700">
          <p className="text-sm text-gray-300">
            {picked
              ? `Selected: ${picked.lat.toFixed(4)}, ${picked.lng.toFixed(4)}`
              : "Click on the map to pick a location"}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!picked}
              className="px-4 py-2 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
