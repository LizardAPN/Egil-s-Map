"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button, Dialog } from "@imprint/ui";

import { useMapController } from "../components/map/MapCanvas";
import { useEditorStore } from "../stores/editor-store";

export function useCreatePinMode() {
  const controller = useMapController();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isCreateMode = useEditorStore((state) => state.isCreateMode);
  const isFormDirty = useEditorStore((state) => state.isFormDirty);
  const setCreateMode = useEditorStore((state) => state.setCreateMode);
  const setDraftLocation = useEditorStore((state) => state.setDraftLocation);
  const reset = useEditorStore((state) => state.reset);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const clearEditPinParam = useCallback(() => {
    if (!searchParams.get("editPin")) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("editPin");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!controller) {
      return;
    }

    return controller.onDraftChange((location) => {
      setDraftLocation(location);

      if (location && controller.isInCreateMode() && !controller.isInMoveMode()) {
        setCreateMode(true);
      }
    });
  }, [controller, setCreateMode, setDraftLocation]);

  const exitCreateMode = useCallback(() => {
    clearEditPinParam();
    controller?.exitCreateMode();
    reset();
  }, [clearEditPinParam, controller, reset]);

  const requestExit = useCallback(() => {
    if (isFormDirty) {
      setConfirmOpen(true);
      return;
    }

    exitCreateMode();
  }, [exitCreateMode, isFormDirty]);

  const enterCreateMode = useCallback(() => {
    clearEditPinParam();
    setDraftLocation(null);
    controller?.enterCreateMode();
    setCreateMode(true);
  }, [clearEditPinParam, controller, setCreateMode, setDraftLocation]);

  const toggleCreateMode = useCallback(() => {
    if (isCreateMode) {
      requestExit();
      return;
    }

    enterCreateMode();
  }, [enterCreateMode, isCreateMode, requestExit]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || !isCreateMode || controller?.isInMoveMode()) {
        return;
      }

      event.preventDefault();
      requestExit();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [controller, isCreateMode, requestExit]);

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
