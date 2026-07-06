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
    if (!editPin) {
      return;
    }

    setDraftLocation(editPin.location);
  }, [editPin, setDraftLocation]);

  return (
    <>
      <CreatePinFab
        isCreateMode={createPinMode.isCreateMode}
        onToggle={createPinMode.toggleCreateMode}
      />
      <PinEditorSheet
        requestExit={createPinMode.requestExit}
        confirmDialog={createPinMode.confirmDialog}
        existingPin={editPin ?? null}
      />
    </>
  );
}
