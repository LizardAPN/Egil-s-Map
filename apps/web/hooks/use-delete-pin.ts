"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createBrowserClient, deletePin } from "@imprint/api";
import type { PinListItem } from "@imprint/types";
import { toast } from "@imprint/ui";

import { pinKeys } from "../lib/pin-keys";
import { useMapStore } from "../stores/map-store";

interface DeletePinContext {
  previousQueries: Array<[readonly unknown[], PinListItem[] | undefined]>;
}

export function useDeletePin() {
  const queryClient = useQueryClient();
  const setActivePin = useMapStore((state) => state.setActivePin);

  return useMutation({
    mutationFn: async (id: string) => {
      await deletePin(createBrowserClient(), id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: pinKeys.all });
      await queryClient.cancelQueries({ queryKey: pinKeys.detail(id) });

      const previousQueries = queryClient.getQueriesData<PinListItem[]>({
        queryKey: pinKeys.all,
      });

      for (const [key, data] of previousQueries) {
        if (!data) {
          continue;
        }

        queryClient.setQueryData<PinListItem[]>(
          key,
          data.filter((pin) => pin.id !== id),
        );
      }

      queryClient.removeQueries({ queryKey: pinKeys.detail(id) });
      queryClient.removeQueries({ queryKey: pinKeys.media(id) });
      setActivePin(null);

      return { previousQueries } satisfies DeletePinContext;
    },
    onSuccess: () => {
      toast("Воспоминание удалено");
    },
    onError: (_error, id, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }

      toast.error("Не удалось удалить");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: pinKeys.all });
    },
  });
}
