import type { Bbox } from "@imprint/types";

import type { PinsInViewFilters } from "../hooks/use-pins-in-view";

export const pinKeys = {
  all: ["pins"] as const,
  bounds: (bbox: Bbox | null, filters?: PinsInViewFilters) =>
    [
      "pins",
      "bounds",
      bbox,
      filters?.chapterId,
      filters?.from,
      filters?.to,
    ] as const,
};
