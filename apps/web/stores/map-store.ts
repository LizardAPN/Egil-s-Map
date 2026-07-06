import { create } from "zustand";

import type { Bbox } from "@imprint/types";

interface MapScope {
  chapterId: string | null;
}

interface MapStore {
  bbox: Bbox | null;
  zoom: number;
  isMapReady: boolean;
  activePinId: string | null;
  scope: MapScope;
  setBbox: (bbox: Bbox, zoom: number) => void;
  setReady: (ready: boolean) => void;
  setActivePin: (id: string | null) => void;
  setScope: (chapterId: string | null) => void;
}

export const useMapStore = create<MapStore>((set) => ({
  bbox: null,
  zoom: 3.2,
  isMapReady: false,
  activePinId: null,
  scope: { chapterId: null },
  setBbox: (bbox, zoom) => {
    set({ bbox, zoom });
  },
  setReady: (ready) => {
    set({ isMapReady: ready });
  },
  setActivePin: (id) => {
    set({ activePinId: id });
  },
  setScope: (chapterId) => {
    set({ scope: { chapterId } });
  },
}));
