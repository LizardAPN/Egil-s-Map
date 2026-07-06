"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { Button, Dialog } from "@imprint/ui";

import { useMapController } from "../components/map/MapCanvas";
import { useCreatePinMode } from "./use-create-pin-mode";
import { useSelectPin } from "./use-select-pin";
import { useEditorStore } from "../stores/editor-store";

export function useTimelinePinSelect() {
  const controller = useMapController();
  const selectPin = useSelectPin();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const editPinId = searchParams.get("editPin");
  const isCreateMode = useEditorStore((state) => state.isCreateMode);
  const isFormDirty = useEditorStore((state) => state.isFormDirty);
  const { exitCreateMode } = useCreatePinMode();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPinId, setPendingPinId] = useState<string | null>(null);

  const clearEditPinParam = useCallback(() => {
    if (!editPinId) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("editPin");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [editPinId, pathname, router, searchParams]);

  const requestSelectPin = useCallback(
    (pinId: string) => {
      if (controller?.isInMoveMode()) {
        return;
      }

      const hasDirtyDraft = (isCreateMode || Boolean(editPinId)) && isFormDirty;

      if (hasDirtyDraft) {
        setPendingPinId(pinId);
        setConfirmOpen(true);
        return;
      }

      selectPin(pinId);
    },
    [controller, editPinId, isCreateMode, isFormDirty, selectPin],
  );

  const confirmDialog = (
    <Dialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title={editPinId ? "Отменить редактирование?" : "Отменить создание?"}
      description="Несохранённые изменения будут потеряны."
    >
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          setConfirmOpen(false);
          setPendingPinId(null);
        }}
      >
        Остаться
      </Button>
      <Button
        type="button"
        onClick={() => {
          setConfirmOpen(false);
          clearEditPinParam();
          exitCreateMode();
          if (pendingPinId) {
            selectPin(pendingPinId);
          }
          setPendingPinId(null);
        }}
      >
        Выйти
      </Button>
    </Dialog>
  );

  return { requestSelectPin, confirmDialog };
}
