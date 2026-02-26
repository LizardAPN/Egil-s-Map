"use client";

import "leaflet/dist/leaflet.css";
import { useSession, signOut } from "next-auth/react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import dynamic from "next/dynamic";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { isValidLocale, type Locale } from "@/lib/i18n-utils";

const MapCanvas = dynamic(() => import("./MapCanvas"), { ssr: false });

export default function MapView() {
  const { data: session, status } = useSession();
  const { i18n, t } = useTranslation("common");

  const token = (session as { accessToken?: string })?.accessToken;
  const locale: Locale = isValidLocale(i18n.language) ? i18n.language : "en";

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between p-4 bg-gray-900/50 backdrop-blur-md z-10 border-b h-[1px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent">
        <Link href="/" className="text-xl font-bold text-amber-400 font-cinzel uppercase">Egil&apos;s Map</Link>
        <nav className="flex items-center gap-4 font-cinzel uppercase">
          <Link href="/map" className="text-amber-400">{t("nav.map")}</Link>
          <Link href="/feed">{t("nav.feed")}</Link>
          <Link href="/strongholds">{t("nav.strongholds")}</Link>
          {status === "authenticated" ? (
            <>
              <Link href="/create-pin">{t("nav.addPin")}</Link>
              <Link href="/profile">{t("nav.profile")}</Link>
              <Link href="/admin">{t("nav.admin")}</Link>
              <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="text-inherit hover:underline bg-transparent border-none cursor-pointer p-0 font-inherit">
                {t("nav.signOut")}
              </button>
            </>
          ) : (
            <Link href="/login">{t("nav.signIn")}</Link>
          )}
          <LanguageSwitcher />
        </nav>
      </header>
      <div className="flex-1 relative">
        <MapCanvas token={token} locale={locale} />
      </div>
    </div>
  );
}
