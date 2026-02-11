/** Format chapter date range for display (e.g. "Mar 2020 — present" or "Jan 2018 — Dec 2019") */
export function formatChapterDateRange(
  started?: string | null,
  ended?: string | null,
  locale = "en",
  presentStr = "present"
): string {
  if (!started && !ended) return "";
  const fmt = (s: string) => {
    try {
      const d = new Date(s);
      return d.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };
  const startStr = started ? fmt(started) : "";
  const endStr = ended ? fmt(ended) : presentStr;
  if (!startStr && !endStr) return "";
  return startStr && endStr ? `${startStr} — ${endStr}` : startStr || endStr;
}
