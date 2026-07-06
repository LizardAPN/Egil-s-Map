"use client";

import { useCallback, useEffect, useState } from "react";

import { Button, Dialog } from "@imprint/ui";

import { useMapController } from "../components/map/MapCanvas";
import { useEditorStore } from "../stores/editor-store";

export function useCreatePinMode() {
  const controller = useMapController();
  const isCreateMode = useEditorStore((state) => state.isCreateMode);
  const isFormDirty = useEditorStore((state) => state.isFormDirty);
  const setCreateMode = useEditorStore((state) => state.setCreateMode);
  const setDraftLocation = useEditorStore((state) => state.setDraftLocation);
  const reset = useEditorStore((state) => state.reset);

  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!controller) {
      return;
    }

    return controller.onDraftChange((location) => {
      setDraftLocation(location);

      if (location) {
        setCreateMode(true);
      }
    });
  }, [controller, setCreateMode, setDraftLocation]);

  const exitCreateMode = useCallback(() => {
    controller?.exitCreateMode();
    reset();
  }, [controller, reset]);

  const requestExit = useCallback(() => {
    if (isFormDirty) {
      setConfirmOpen(true);
      return;
    }

    exitCreateMode();
  }, [exitCreateMode, isFormDirty]);

  const enterCreateMode = useCallback(() => {
    controller?.enterCreateMode();
    setCreateMode(true);
  }, [controller, setCreateMode]);

  const toggleCreateMode = useCallback(() => {
    if (isCreateMode) {
      requestExit();
      return;
    }

    enterCreateMode();
  }, [enterCreateMode, isCreateMode, requestExit]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || !isCreateMode) {
        return;
      }

      event.preventDefault();
      requestExit();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCreateMode, requestExit]);

  const confirmDialog = (
    <Dialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title="Отменить создание?"
      description="Несохранённые изменения будут потеряны."
    >
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          setConfirmOpen(false);
        }}
      >
        Остаться
      </Button>
      <Button
        type="button"
        onClick={() => {
          setConfirmOpen(false);
          exitCreateMode();
        }}
      >
        Выйти
      </Button>
    </Dialog>
  );

  return {
    isCreateMode,
    toggleCreateMode,
    enterCreateMode,
    requestExit,
    exitCreateMode,
    confirmDialog,
  };
}
