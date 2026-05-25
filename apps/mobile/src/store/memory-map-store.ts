import type { MemoryPinMapItem } from "@imprint/api/mobile";
import type { Coordinates } from "@imprint/types";
import { create } from "zustand";

interface FocusTarget {
  pinId: string;
  coordinates: Coordinates;
}

interface MemoryMapState {
  selectedPinId: string | null;
  optimisticPins: MemoryPinMapItem[];
  focusTarget: FocusTarget | null;
  setSelectedPinId: (pinId: string | null) => void;
  addOptimisticPin: (pin: MemoryPinMapItem) => void;
  replaceOptimisticPin: (temporaryId: string, pin: MemoryPinMapItem) => void;
  removeOptimisticPin: (pinId: string) => void;
  queueFocusTarget: (target: FocusTarget) => void;
  clearFocusTarget: () => void;
}

export const useMemoryMapStore = create<MemoryMapState>((set) => ({
  selectedPinId: null,
  optimisticPins: [],
  focusTarget: null,
  setSelectedPinId: (pinId) => {
    set({ selectedPinId: pinId });
  },
  addOptimisticPin: (pin) => {
    set((state) => ({
      optimisticPins: [
        pin,
        ...state.optimisticPins.filter((existingPin) => existingPin.id !== pin.id)
      ]
    }));
  },
  replaceOptimisticPin: (temporaryId, pin) => {
    set((state) => ({
      optimisticPins: state.optimisticPins.map((existingPin) =>
        existingPin.id === temporaryId ? pin : existingPin
      )
    }));
  },
  removeOptimisticPin: (pinId) => {
    set((state) => ({
      optimisticPins: state.optimisticPins.filter((pin) => pin.id !== pinId)
    }));
  },
  queueFocusTarget: (target) => {
    set({ focusTarget: target, selectedPinId: target.pinId });
  },
  clearFocusTarget: () => {
    set({ focusTarget: null });
  }
}));
