"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { useCloseActivePin } from "../../hooks/use-map-pin-sync";
import { usePinDetail } from "../../hooks/use-pin-detail";
import { useEditorStore } from "../../stores/editor-store";
import { useMapStore } from "../../stores/map-store";
import { PinCard } from "../pin/PinCard";

export function MapPinDetailUi() {
  const activePinId = useMapStore((state) => state.activePinId);
  const closeActivePin = useCloseActivePin();
  const searchParams = useSearchParams();
  const editPinId = searchParams.get("editPin");

  const isCreateMode = useEditorStore((state) => state.isCreateMode);
  const { data: pin, isFetched, isLoading } = usePinDetail(activePinId);

  useEffect(() => {
    if (!activePinId || isLoading || !isFetched) {
      return;
    }

    if (!pin) {
      closeActivePin({ replace: true });
    }
  }, [activePinId, pin, isFetched, isLoading, closeActivePin]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || !activePinId) {
        return;
      }

      if (editPinId || isCreateMode) {
        return;
      }

      event.preventDefault();
      closeActivePin();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePinId, closeActivePin, editPinId, isCreateMode]);

  if (!activePinId) {
    return null;
  }

  return (
    <div className="pointer-events-auto fixed top-[68px] right-4 z-30 w-[320px]">
      <PinCard pinId={activePinId} onClose={closeActivePin} />
    </div>
  );
}
