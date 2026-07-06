"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef } from "react";

import { createBrowserClient, createPin, uploadPinMedia } from "@imprint/api";
import type { CreatePinInput, PinListItem } from "@imprint/types";
import { toast } from "@imprint/ui";

import { useMapController } from "../components/map/MapCanvas";
import { queryBboxForPins } from "../lib/map/bbox";
import { pinKeys } from "../lib/pin-keys";
import { useEditorStore } from "../stores/editor-store";
import { useMapStore } from "../stores/map-store";

export interface CreatePinMutationInput extends CreatePinInput {
  stagedFiles?: File[];
}

interface CreatePinContext {
  previousQueries: Array<[readonly unknown[], PinListItem[] | undefined]>;
  tempId: string;
  queryKey: ReturnType<typeof pinKeys.bounds>;
}

async function uploadStagedPhotos(pinId: string, files: File[], startIndex = 0) {
  if (files.length === 0 || startIndex >= files.length) {
    return;
  }

  const remaining = files.slice(startIndex);
  const supabase = createBrowserClient();
  let toastId: string | number | undefined;
  let failedAt = startIndex;

  try {
    await uploadPinMedia(supabase, pinId, remaining, (progress) => {
      const absoluteIndex = startIndex + progress.index + 1;
      toastId = toast(`Загружаю фото… ${String(absoluteIndex)}/${String(files.length)}`, {
        id: toastId,
      });
      failedAt = startIndex + progress.index;
    });
    toast.success("Фото добавлены", { id: toastId });
  } catch {
    toast.error("Не удалось загрузить фото", {
      id: toastId,
      action: {
        label: "Повторить",
        onClick: () => {
          void uploadStagedPhotos(pinId, files, failedAt);
        },
      },
    });
  }
}

export function useCreatePin() {
  const queryClient = useQueryClient();
  const controller = useMapController();
  const bbox = useMapStore((state) => state.bbox);
  const zoom = useMapStore((state) => state.zoom);
  const setActivePin = useMapStore((state) => state.setActivePin);
  const resetEditor = useEditorStore((state) => state.reset);

  const queryBbox = useMemo(() => {
    if (!bbox) {
      return null;
    }

    return queryBboxForPins(bbox, zoom);
  }, [bbox, zoom]);

  const queryKey = pinKeys.bounds(queryBbox);
  const retryRef = useRef<(input: CreatePinMutationInput) => void>(() => undefined);

  const mutation = useMutation({
    mutationFn: async (input: CreatePinMutationInput) => {
      const pinInput: CreatePinInput = {
        chapterId: input.chapterId,
        location: input.location,
        locationName: input.locationName,
        title: input.title,
        body: input.body,
        visibility: input.visibility,
        pinnedAt: input.pinnedAt,
      };
      const supabase = createBrowserClient();
      return createPin(supabase, pinInput);
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: pinKeys.all });

      const previousQueries = queryClient.getQueriesData<PinListItem[]>({
        queryKey: pinKeys.all,
      });

      const {
        data: { user },
      } = await createBrowserClient().auth.getUser();

      if (!user || !queryBbox) {
        return { previousQueries, tempId: "", queryKey };
      }

      const tempId = `temp-${crypto.randomUUID()}`;
      const optimisticPin: PinListItem = {
        id: tempId,
        userId: user.id,
        chapterId: input.chapterId ?? null,
        location: input.location,
        locationExact: true,
        locationName: input.locationName ?? null,
        title: input.title,
        visibility: input.visibility ?? "private",
        pinnedAt: input.pinnedAt ?? new Date().toISOString(),
      };

      queryClient.setQueryData<PinListItem[]>(queryKey, (current) => [
        ...(current ?? []),
        optimisticPin,
      ]);

      return { previousQueries, tempId, queryKey } satisfies CreatePinContext;
    },
    onSuccess: (result, input, context) => {
      if (!context.tempId) {
        return;
      }

      queryClient.setQueryData<PinListItem[]>(context.queryKey, (current) =>
        (current ?? []).map((pin) =>
          pin.id === context.tempId ? { ...pin, id: result.id } : pin,
        ),
      );

      controller?.exitCreateMode();
      resetEditor();
      setActivePin(result.id);
      toast("Воспоминание сохранено");

      const stagedFiles = input.stagedFiles ?? [];

      if (stagedFiles.length > 0) {
        void uploadStagedPhotos(result.id, stagedFiles);
      }
    },
    onError: (_error, input, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }

      toast.error("Не удалось сохранить", {
        action: {
          label: "Повторить",
          onClick: () => {
            retryRef.current(input);
          },
        },
      });
    },
    onSettled: () => {
      if (queryBbox) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });

  retryRef.current = (input) => {
    mutation.mutate(input);
  };

  return mutation;
}
