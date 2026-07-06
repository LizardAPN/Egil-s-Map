"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createBrowserClient, updatePin } from "@imprint/api";
import type { Pin, PinListItem, UpdatePinInput } from "@imprint/types";
import { toast } from "@imprint/ui";

import { pinKeys } from "../lib/pin-keys";

interface UpdatePinVariables {
  id: string;
  patch: UpdatePinInput;
}

interface UpdatePinContext {
  previousDetail: Pin | null | undefined;
  previousQueries: Array<[readonly unknown[], PinListItem[] | undefined]>;
}

function applyPatchToListItem(
  pin: PinListItem,
  patch: UpdatePinInput,
): PinListItem {
  return {
    ...pin,
    title: patch.title ?? pin.title,
    locationName:
      patch.locationName !== undefined ? patch.locationName : pin.locationName,
    visibility: patch.visibility ?? pin.visibility,
    pinnedAt: patch.pinnedAt ?? pin.pinnedAt,
    chapterId:
      patch.chapterId !== undefined ? patch.chapterId : pin.chapterId,
    location: patch.location ?? pin.location,
    locationExact: patch.location ? true : pin.locationExact,
  };
}

export function useUpdatePin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: UpdatePinVariables) => {
      return updatePin(createBrowserClient(), id, patch);
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: pinKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: pinKeys.all });

      const previousDetail = queryClient.getQueryData<Pin | null>(
        pinKeys.detail(id),
      );

      const previousQueries = queryClient.getQueriesData<PinListItem[]>({
        queryKey: pinKeys.all,
      });

      if (previousDetail) {
        const updated: Pin = {
          ...previousDetail,
          ...applyPatchToListItem(previousDetail, patch),
          body: patch.body !== undefined ? patch.body : previousDetail.body,
        };
        queryClient.setQueryData<Pin | null>(pinKeys.detail(id), updated);
      }

      for (const [key, data] of previousQueries) {
        if (!data) {
          continue;
        }

        queryClient.setQueryData<PinListItem[]>(
          key,
          data.map((pin) =>
            pin.id === id ? applyPatchToListItem(pin, patch) : pin,
          ),
        );
      }

      return { previousDetail, previousQueries } satisfies UpdatePinContext;
    },
    onError: (_error, { id }, context) => {
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(pinKeys.detail(id), context.previousDetail);
      }

      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }

      toast.error("Не удалось сохранить");
    },
    onSettled: (_data, _error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: pinKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: pinKeys.all });
      void queryClient.invalidateQueries({ queryKey: pinKeys.media(id) });
    },
  });
}
