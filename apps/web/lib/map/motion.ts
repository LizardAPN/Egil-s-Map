let prefersReducedMotion: boolean | null = null;

function readPrefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function getPrefersReducedMotion(): boolean {
  if (prefersReducedMotion === null) {
    prefersReducedMotion = readPrefersReducedMotion();

    if (typeof window !== "undefined") {
      window
        .matchMedia("(prefers-reduced-motion: reduce)")
        .addEventListener("change", (event) => {
          prefersReducedMotion = event.matches;
        });
    }
  }

  return prefersReducedMotion;
}
