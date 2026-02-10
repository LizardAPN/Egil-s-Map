export const SUPPORTED_LOCALES = ["en", "ru"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const LOCALE_COOKIE = "NEXT_LOCALE";

export function isValidLocale(s: string): s is Locale {
  return SUPPORTED_LOCALES.includes(s as Locale);
}

export function getStoredLocale(): Locale {
  if (typeof document === "undefined") return "en";
  const stored = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1];
  const value = stored || "";
  return isValidLocale(value) ? value : "en";
}

export function setStoredLocale(locale: Locale): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000`;
}
