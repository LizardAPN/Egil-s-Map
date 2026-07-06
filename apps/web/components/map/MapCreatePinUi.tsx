"use client";

import { CreatePinFab } from "../map/CreatePinFab";
import { PinEditorSheet } from "../pin/PinEditorSheet";
import { useCreatePinMode } from "../../hooks/use-create-pin-mode";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { createBrowserClient, getById } from "@imprint/api";

import { pinKeys } from "../../lib/pin-keys";
import { useEditorStore } from "../../stores/editor-store";

export function MapCreatePinUi() {
  const createPinMode = useCreatePinMode();
  const searchParams = useSearchParams();
  const editPinId = searchParams.get("editPin");
  const isCreateMode = useEditorStore((state) => state.isCreateMode);
  const setCreateMode = useEditorStore((state) => state.setCreateMode);
  const setDraftLocation = useEditorStore((state) => state.setDraftLocation);

  const { data: editPin } = useQuery({
    queryKey: pinKeys.detail(editPinId),
    queryFn: async () => {
      if (!editPinId) {
        return null;
      }

      return getById(createBrowserClient(), editPinId);
    },
    enabled: Boolean(editPinId),
  });

  useEffect(() => {
    if (!editPinId) {
      return;
    }

    setCreateMode(false);
  }, [editPinId, setCreateMode]);

  useEffect(() => {
    if (editPinId || isCreateMode) {
      return;
    }

    setDraftLocation(null);
  }, [editPinId, isCreateMode, setDraftLocation]);

  useEffect(() => {
    if (!editPinId || !editPin) {
      return;
    }

    setDraftLocation(editPin.location);
  }, [editPinId, editPin, setDraftLocation]);

  const sheetExistingPin = editPinId ? (editPin ?? null) : null;

  return (
    <>
      <CreatePinFab
        isCreateMode={createPinMode.isCreateMode}
        onToggle={createPinMode.toggleCreateMode}
      />
      <PinEditorSheet
        key={editPinId ?? (isCreateMode ? "create" : "idle")}
        requestExit={createPinMode.requestExit}
        exitEditor={createPinMode.exitCreateMode}
        confirmDialog={createPinMode.confirmDialog}
        existingPin={sheetExistingPin}
      />
    </>
  );
}
