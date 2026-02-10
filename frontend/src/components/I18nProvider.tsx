"use client";

import { useEffect, useState } from "react";

type ClientI18nProps = { children: React.ReactNode };

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [ClientI18n, setClientI18n] = useState<React.ComponentType<ClientI18nProps> | null>(null);

  useEffect(() => {
    import("./ClientI18n").then((m) => setClientI18n(() => m.default));
  }, []);

  if (!ClientI18n) return <>{children}</>;
  return <ClientI18n>{children}</ClientI18n>;
}
