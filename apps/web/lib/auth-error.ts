export function resolveAuthCatchError(caught: unknown): string {
  if (!(caught instanceof Error)) {
    return "unknown";
  }

  const message = caught.message.toLowerCase();

  if (message.includes("missing supabase env")) {
    return "config";
  }

  if (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("load failed")
  ) {
    return "offline";
  }

  return "unknown";
}

export function authOfflineMessage(): string {
  return "Не удалось связаться с Supabase. Запусти `npx supabase start` и перезагрузи страницу.";
}
