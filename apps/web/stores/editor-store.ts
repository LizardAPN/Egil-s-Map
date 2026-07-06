import { create } from "zustand";

import type { PinLocation } from "@imprint/types";

interface EditorStore {
  isCreateMode: boolean;
  draftLocation: PinLocation | null;
  isFormDirty: boolean;
  setCreateMode: (value: boolean) => void;
  setDraftLocation: (location: PinLocation | null) => void;
  setFormDirty: (value: boolean) => void;
  reset: () => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  isCreateMode: false,
  draftLocation: null,
  isFormDirty: false,
  setCreateMode: (value) => {
    set({ isCreateMode: value });
  },
  setDraftLocation: (location) => {
    set({ draftLocation: location });
  },
  setFormDirty: (value) => {
    set({ isFormDirty: value });
  },
  reset: () => {
    set({
      isCreateMode: false,
      draftLocation: null,
      isFormDirty: false,
    });
  },
}));
