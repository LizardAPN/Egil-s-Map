"use client";

import { useQuery } from "@tanstack/react-query";

import { createBrowserClient, getById } from "@imprint/api";

import { pinKeys } from "../lib/pin-keys";

export function usePinDetail(pinId: string | null) {
  return useQuery({
    queryKey: pinKeys.detail(pinId),
    queryFn: async () => {
      if (!pinId) {
        return null;
      }

      return getById(createBrowserClient(), pinId);
    },
    enabled: Boolean(pinId),
    staleTime: 30_000,
  });
}
