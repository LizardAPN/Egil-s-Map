"use client";

import { useQuery } from "@tanstack/react-query";

import { createBrowserClient } from "@imprint/api";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      const {
        data: { user },
      } = await createBrowserClient().auth.getUser();
      return user;
    },
    staleTime: 5 * 60_000,
  });
}
