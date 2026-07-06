"use client";

import { CreatePinFab } from "../map/CreatePinFab";
import { PinEditorSheet } from "../pin/PinEditorSheet";
import { useCreatePinMode } from "../../hooks/use-create-pin-mode";

export function MapCreatePinUi() {
  const createPinMode = useCreatePinMode();

  return (
    <>
      <CreatePinFab
        isCreateMode={createPinMode.isCreateMode}
        onToggle={createPinMode.toggleCreateMode}
      />
      <PinEditorSheet
        requestExit={createPinMode.requestExit}
        confirmDialog={createPinMode.confirmDialog}
      />
    </>
  );
}
