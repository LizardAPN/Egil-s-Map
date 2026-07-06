"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { useMapController } from "../components/map/MapCanvas";
import { pinsToBounds } from "../lib/map/bounds";
import { getTimelineCameraPadding } from "../lib/map/camera-padding";
import { useMyPins } from "./use-my-pins";
import { useTimelineCollapsed } from "./use-timeline-collapsed";
import { useMapStore } from "../stores/map-store";

export function useChapterScopeSync(): void {
  const controller = useMapController();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const chapterParam = searchParams.get("chapter");
  const scopeChapterId = useMapStore((state) => state.scope.chapterId);
  const setScope = useMapStore((state) => state.setScope);
  const isMapReady = useMapStore((state) => state.isMapReady);
  const { collapsed } = useTimelineCollapsed();
  const { data: scopedPins } = useMyPins();
  const skipStoreToUrlRef = useRef(false);
  const fittedChapterRef = useRef<string | null>(null);

  // URL → store
  useEffect(() => {
    setScope(chapterParam);
    skipStoreToUrlRef.current = true;
  }, [chapterParam, setScope]);

  // Store → URL
  useEffect(() => {
    if (skipStoreToUrlRef.current) {
      skipStoreToUrlRef.current = false;
      return;
    }

    if (scopeChapterId === chapterParam) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (scopeChapterId) {
      params.set("chapter", scopeChapterId);
    } else {
      params.delete("chapter");
    }

    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [scopeChapterId, chapterParam, pathname, router, searchParams]);

  // Fit camera when chapter scope is active
  useEffect(() => {
    if (!controller || !isMapReady || !scopeChapterId || !scopedPins) {
      if (!scopeChapterId) {
        fittedChapterRef.current = null;
      }
      return;
    }

    if (fittedChapterRef.current === scopeChapterId) {
      return;
    }

    const bounds = pinsToBounds(scopedPins);

    if (!bounds) {
      return;
    }

    fittedChapterRef.current = scopeChapterId;
    controller.fitBounds(bounds, getTimelineCameraPadding(collapsed));
  }, [controller, isMapReady, scopeChapterId, scopedPins, collapsed]);

  useEffect(() => {
    if (!scopeChapterId) {
      fittedChapterRef.current = null;
    }
  }, [scopeChapterId]);
}

export function useSetChapterScope() {
  return (chapterId: string | null) => {
    useMapStore.getState().setScope(chapterId);
  };
}
