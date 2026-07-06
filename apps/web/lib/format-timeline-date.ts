const monthHeaderFormatter = new Intl.DateTimeFormat("ru-RU", {
  month: "long",
  year: "numeric",
});

const dayFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
});

export function formatTimelineMonthHeader(iso: string): string {
  return monthHeaderFormatter.format(new Date(iso));
}

export function formatTimelineDay(iso: string): string {
  return dayFormatter.format(new Date(iso)).replace(/\.$/, "");
}

export function monthKeyFromIso(iso: string): string {
  const date = new Date(iso);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${String(year)}-${month}`;
}
