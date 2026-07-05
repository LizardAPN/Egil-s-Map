export function safeRedirectPath(
  next: string | null,
  fallback = "/map",
): string {
  if (!next) {
    return fallback;
  }

  if (!next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  return next;
}
