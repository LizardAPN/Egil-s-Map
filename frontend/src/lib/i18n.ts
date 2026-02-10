import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { SUPPORTED_LOCALES } from "./i18n-utils";

import enCommon from "@/locales/en/common.json";
import ruCommon from "@/locales/ru/common.json";

const LOCALE_COOKIE = "NEXT_LOCALE";

if (typeof window !== "undefined") {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: "en",
      supportedLngs: [...SUPPORTED_LOCALES],
      ns: ["common"],
      defaultNS: "common",
      resources: {
        en: { common: enCommon as Record<string, unknown> },
        ru: { common: ruCommon as Record<string, unknown> },
      },
      detection: {
        order: ["cookie", "localStorage", "navigator"],
        lookupCookie: LOCALE_COOKIE,
        lookupLocalStorage: LOCALE_COOKIE,
        caches: ["cookie", "localStorage"],
      },
      interpolation: {
        escapeValue: false,
      },
    });
}

export default i18n;
