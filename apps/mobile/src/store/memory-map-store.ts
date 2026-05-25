import { create } from "zustand";

interface MemoryMapState {
  selectedPinId: string | null;
  setSelectedPinId: (pinId: string | null) => void;
}

export const useMemoryMapStore = create<MemoryMapState>((set) => ({
  selectedPinId: null,
  setSelectedPinId: (pinId) => {
    set({ selectedPinId: pinId });
  }
}));
