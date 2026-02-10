"use client";

import { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import type { i18n } from "i18next";
import { getStoredLocale, setStoredLocale } from "@/lib/i18n-utils";

export default function ClientI18n({ children }: { children: React.ReactNode }) {
  const [i18n, setI18n] = useState<i18n | null>(null);

  useEffect(() => {
    import("@/lib/i18n").then((m) => {
      const instance = m.default;
      const stored = getStoredLocale();
      instance.changeLanguage(stored);
      setStoredLocale(stored);
      setI18n(instance);
    });
  }, []);

  if (!i18n) return <>{children}</>;
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
