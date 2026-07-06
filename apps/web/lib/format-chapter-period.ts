const monthYearFormatter = new Intl.DateTimeFormat("ru-RU", {
  month: "short",
  year: "numeric",
});

function formatMonthYear(iso: string): string {
  return monthYearFormatter.format(new Date(iso)).replace(/\.$/, "");
}

export function formatChapterPeriod(
  startedAt: string | null,
  endedAt: string | null,
): string | null {
  if (startedAt && endedAt) {
    return `${formatMonthYear(startedAt)} — ${formatMonthYear(endedAt)}`;
  }

  if (startedAt) {
    return `с ${formatMonthYear(startedAt)}`;
  }

  if (endedAt) {
    return `до ${formatMonthYear(endedAt)}`;
  }

  return null;
}
