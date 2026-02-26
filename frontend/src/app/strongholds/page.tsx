"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import AddressSearch from "@/components/AddressSearch";
import { isValidToken, withLocale } from "@/lib/api";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { isValidLocale, type Locale } from "@/lib/i18n-utils";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function CreateStrongholdForm({
  token,
  onCreated,
  t,
}: {
  token?: string;
  onCreated: () => void;
  t: (key: string) => string;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState(55.75);
  const [lng, setLng] = useState(37.62);
  const [isPrivate, setIsPrivate] = useState(false);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidToken(token)) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/strongholds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description: description || null, lat, lng, is_private: isPrivate }),
      });
      if (res.ok) {
        setName("");
        setDescription("");
        setLocationLabel(null);
        onCreated();
      } else {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        const msg = Array.isArray(err.detail)
          ? err.detail.map((e: { msg?: string }) => e.msg || JSON.stringify(e)).join("; ")
          : err.detail || "Failed to create stronghold";
        console.error("API Error: create stronghold", msg, err);
        alert(msg);
      }
    } catch (err) {
      console.error("API Error: create stronghold", err);
      alert("Failed to create stronghold. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8 p-4 bg-[#1a1a1e] border-2 border-[#3a3a3e] rounded-sm shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
      <h2 className="font-medium mb-2 font-cinzel">{t("strongholds.createStronghold")}</h2>
      <div className="space-y-4">
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("strongholds.name")}
            className="w-full px-3 py-2 bg-[#0a0a0c] border border-gray-600 focus:border-[#d4af37] font-special-elite"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1 font-special-elite">{t("strongholds.manifesto")}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("strongholds.manifestoPlaceholder")}
            rows={3}
            className="w-full px-3 py-2 bg-[#0a0a0c] border border-gray-600 focus:border-[#d4af37] font-special-elite"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_private"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
          />
          <label htmlFor="is_private" className="font-special-elite text-sm">{t("strongholds.private")}</label>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1 font-special-elite">{t("strongholds.location")}</label>
          <AddressSearch
            onSelect={({ lat: la, lng: ln, display_name }) => {
              setLat(la);
              setLng(ln);
              setLocationLabel(display_name);
            }}
            placeholder="Search address..."
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => setMapPickerOpen(true)}
              className="px-4 py-2 bg-[#d4af37] text-gray-900 hover:bg-[#b8860b] hover:brightness-110 font-cinzel"
            >
              {t("strongholds.pickOnMap")}
            </button>
            {locationLabel && (
              <span className="text-sm text-gray-400 truncate max-w-[200px] font-special-elite" title={locationLabel}>
                {locationLabel}
              </span>
            )}
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-[#d4af37] text-gray-900 font-cinzel font-medium hover:bg-[#b8860b] hover:brightness-110 disabled:opacity-50"
        >
          {loading ? t("strongholds.creating") : t("strongholds.create")}
        </button>
      </div>
      <MapPicker
        open={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        onPick={(la, ln) => {
          setLat(la);
          setLng(ln);
          setLocationLabel(`Selected: ${la.toFixed(4)}, ${ln.toFixed(4)}`);
        }}
        initialLat={lat}
        initialLng={lng}
      />
    </form>
  );
}

function StrongholdsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { i18n, t } = useTranslation("common");
  const locale: Locale = isValidLocale(i18n.language) ? i18n.language : "en";
  const [strongholds, setStrongholds] = useState<
    { id: number; name: string; lat: number; lng: number; brightness: number; is_member?: boolean; is_private?: boolean }[]
  >([]);
  const token = (session as { accessToken?: string })?.accessToken;

  useEffect(() => {
    const headers: HeadersInit = isValidToken(token) ? { Authorization: `Bearer ${token}` } : {};
    const path = withLocale("/strongholds", locale);
    fetch(`${API_BASE}${path}`, { headers })
      .then((r) => r.json())
      .then(setStrongholds)
      .catch(() => setStrongholds([]));
  }, [token, locale]);

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between p-4 bg-gray-900/50 backdrop-blur-md border-b h-[1px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent">
        <Link href="/" className="text-xl font-bold text-amber-400 font-cinzel uppercase">
          Egil&apos;s Map
        </Link>
        <nav className="flex items-center gap-4 font-cinzel uppercase">
          <Link href="/map">{t("nav.map")}</Link>
          <Link href="/feed">{t("nav.feed")}</Link>
          <Link href="/strongholds" className="text-amber-400">
            {t("nav.strongholds")}
          </Link>
          {session ? (
            <>
              <Link href="/profile">{t("nav.profile")}</Link>
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
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6 font-cinzel">{t("strongholds.title")}</h1>
        <p className="text-gray-400 mb-8 font-special-elite">
          {t("strongholds.subtitle")}
        </p>
        {session && (
          <CreateStrongholdForm
            token={(session as { accessToken?: string })?.accessToken}
            onCreated={() => window.location.reload()}
            t={t}
          />
        )}
        <div className="grid gap-4">
          {strongholds.map((s) => (
            <div
              key={s.id}
              className="p-4 bg-[#1a1a1e] border-2 border-[#3a3a3e] rounded-sm shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] flex justify-between items-center cursor-pointer hover:border-amber-700/50 transition-colors"
              onClick={() => router.push(`/strongholds/${s.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && router.push(`/strongholds/${s.id}`)}
            >
              <div>
                <h2 className="font-medium font-cinzel">{s.name}</h2>
                <p className="text-sm text-gray-400 font-special-elite">
                  {t("strongholds.brightness")}: {s.brightness} | {s.lat.toFixed(2)}, {s.lng.toFixed(2)}
                </p>
              </div>
              {session && (
                s.is_member ? (
                  <span className="px-4 py-2 text-sm text-gray-400 font-special-elite" onClick={(e) => e.stopPropagation()}>{t("strongholds.member")}</span>
                ) : s.is_private ? (
                  <Link
                    href={`/strongholds/${s.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="px-4 py-2 bg-[#d4af37] text-gray-900 hover:bg-[#b8860b] hover:brightness-110 font-cinzel"
                  >
                    {t("strongholds.requestEntry")}
                  </Link>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isValidToken(token)) return;
                      fetch(`${API_BASE}/strongholds/${s.id}/join`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                      })
                        .then((r) => {
                          if (r.ok) {
                            setStrongholds((prev) =>
                              prev.map((x) =>
                                x.id === s.id ? { ...x, is_member: true } : x
                              )
                            );
                          } else {
                            r.json()
                              .then((err) => {
                                const msg = Array.isArray(err.detail)
                                  ? err.detail.map((x: { msg?: string }) => x.msg || JSON.stringify(x)).join("; ")
                                  : err.detail || "Could not join";
                                console.error("API Error: join stronghold", msg, err);
                                alert(msg);
                              })
                              .catch(() => {
                                console.error("API Error: join stronghold", r.statusText);
                                alert("Could not join");
                              });
                          }
                        });
                    }}
                    className="px-4 py-2 bg-[#d4af37] text-gray-900 hover:bg-[#b8860b] hover:brightness-110 font-cinzel"
                    type="button"
                  >
                    {t("strongholds.join")}
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default StrongholdsPage;
