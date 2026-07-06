"use client";

import { useMemo } from "react";

import { useMyChapters } from "./use-my-chapters";

const EMPTY_COLORS = new Map<string, string>();

export function useChapterColors(): ReadonlyMap<string, string> {
  const { data: chapters } = useMyChapters();

  return useMemo(() => {
    if (!chapters) {
      return EMPTY_COLORS;
    }

    return new Map(chapters.map((chapter) => [chapter.id, chapter.color]));
  }, [chapters]);
}
