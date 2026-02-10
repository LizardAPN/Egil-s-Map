"use client";

import { useTranslation } from "react-i18next";
import { SUPPORTED_LOCALES, type Locale, setStoredLocale } from "@/lib/i18n-utils";

type OnLocaleChange = (locale: Locale) => void;

export function LanguageSwitcher({ onLocaleChange }: { onLocaleChange?: OnLocaleChange }) {
  const { i18n } = useTranslation();

  function handleChange(locale: Locale) {
    i18n.changeLanguage(locale);
    setStoredLocale(locale);
    onLocaleChange?.(locale);
  }

  return (
    <div className="flex gap-2 font-cinzel text-sm uppercase">
      {SUPPORTED_LOCALES.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => handleChange(loc)}
          className={
            i18n.language === loc
              ? "text-amber-400 font-medium"
              : "text-gray-400 hover:text-gray-200"
          }
        >
          {loc === "en" ? "EN" : "RU"}
        </button>
      ))}
    </div>
  );
}
