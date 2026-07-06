"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { pinNavigationState } from "../lib/map-pin-navigation";

export function useSelectPin() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (pinId: string) => {
      const currentPin = searchParams.get("pin");

      if (currentPin === pinId) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());
      params.set("pin", pinId);
      pinNavigationState.selectionPushed = true;
      router.push(
        params.toString() ? `${pathname}?${params.toString()}` : pathname,
        { scroll: false },
      );
    },
    [pathname, router, searchParams],
  );
}
