"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "timeline-collapsed";

function readCollapsed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function useTimelineCollapsed() {
  const [collapsed, setCollapsedState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsedState(readCollapsed());
    setHydrated(true);
  }, []);

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return { collapsed, setCollapsed, toggleCollapsed, hydrated };
}
