"use client";

import { cn } from "@imprint/ui";

interface PinsFetchIndicatorProps {
  fetching: boolean;
}

export function PinsFetchIndicator({ fetching }: PinsFetchIndicatorProps) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-[52px] z-20 h-0.5 bg-amber transition-opacity duration-300",
        fetching ? "opacity-100" : "opacity-0",
      )}
      aria-hidden
    />
  );
}
