const formatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatPinnedAt(iso: string): string {
  return formatter.format(new Date(iso));
}
