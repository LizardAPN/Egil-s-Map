"use client";

import { useSession, signOut } from "next-auth/react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FeedCard, { type FeedItem } from "@/components/FeedCard";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { withLocale, isValidToken } from "@/lib/api";
import { isValidLocale, type Locale } from "@/lib/i18n-utils";
import { InspirationalModal } from "@/components/InspirationalModal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const PAGE_SIZE = 24;

export default function FeedPage() {
  const { data: session, status } = useSession();
  const { i18n, t } = useTranslation("common");
  const locale: Locale = isValidLocale(i18n.language) ? i18n.language : "en";
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [focusedItem, setFocusedItem] = useState<FeedItem | null>(null);

  const loadMore = useCallback(async (reset = false) => {
    const off = reset ? 0 : offset;
    if (!reset && !hasMore) return;
    if (!reset) setLoading(true);
    const path = withLocale(`/pins/feed?offset=${off}&limit=${PAGE_SIZE}`, locale);
    try {
      const res = await fetch(`${API_BASE}${path}`);
      const data: FeedItem[] = await res.json();
      setItems((prev) => (reset ? data : [...prev, ...data]));
      setHasMore(data.length === PAGE_SIZE);
      setOffset(off + data.length);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [offset, hasMore, locale]);

  useEffect(() => {
    loadMore(true);
  }, [locale]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) loadMore();
      },
      { rootMargin: "200px" }
    );
    const sentinel = document.getElementById("feed-sentinel");
    if (sentinel) observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  return (
    <main className="min-h-screen feed-bulletin-bg">
      <header className="flex items-center justify-between p-4 bg-gray-900/80 backdrop-blur-md border-b border-amber-900/40 sticky top-0 z-20">
        <Link href="/" className="text-xl font-bold text-amber-400 font-cinzel uppercase">
          Egil&apos;s Map
        </Link>
        <nav className="flex items-center gap-4 font-cinzel uppercase">
          <Link href="/map">{t("nav.map")}</Link>
          <Link href="/feed" className="text-amber-400">
            {t("nav.feed")}
          </Link>
          <Link href="/strongholds">{t("nav.strongholds")}</Link>
          {status === "authenticated" ? (
            <>
              <Link href="/create-pin">{t("nav.addPin")}</Link>
              <Link href="/profile">{t("nav.profile")}</Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-inherit hover:underline bg-transparent border-none cursor-pointer p-0 font-inherit"
              >
                {t("nav.signOut")}
              </button>
            </>
          ) : (
            <Link href="/login">{t("nav.signIn")}</Link>
          )}
          <LanguageSwitcher />
        </nav>
      </header>

      <div className="feed-container">
        <h1 className="feed-title font-cinzel text-2xl md:text-3xl text-amber-200 text-center py-8">
          {t("feed.title")}
        </h1>
        <p className="feed-subtitle font-special-elite text-gray-400 text-center -mt-4 mb-8 max-w-xl mx-auto">
          {t("feed.subtitle")}
        </p>

        {loading && items.length === 0 ? (
          <div className="flex justify-center py-16">
            <p className="text-gray-400 font-special-elite">{t("pins.loading")}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 font-special-elite">{t("feed.empty")}</p>
          </div>
        ) : (
          <div className="feed-masonry">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <FeedCard
                  key={item.id}
                  item={item}
                  onCardClick={(i) => setFocusedItem(i)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        <div id="feed-sentinel" className="h-4" />
        {loading && items.length > 0 && (
          <div className="flex justify-center py-8">
            <p className="text-gray-500 text-sm font-special-elite">{t("feed.loadingMore")}</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {focusedItem && (
          <FeedFocusModal
            item={focusedItem}
            onClose={() => setFocusedItem(null)}
            onInspire={(id, newCount) => {
              setItems((prev) => prev.map((i) => (i.id === id ? { ...i, inspiration_count: newCount } : i)));
              setFocusedItem((prev) => (prev && prev.id === id ? { ...prev, inspiration_count: newCount } : prev));
            }}
            token={(session as { accessToken?: string })?.accessToken}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function FeedFocusModal({
  item,
  onClose,
  onInspire,
  token,
}: {
  item: FeedItem;
  onClose: () => void;
  onInspire?: (pinId: number, newCount: number) => void;
  token?: string;
}) {
  const { t } = useTranslation("common");
  const [inspireError, setInspireError] = useState<string | null>(null);
  const [inspireLoading, setInspireLoading] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const isQuote = item.content_type === "text" && item.text_content && item.text_content.length < 200;
  const isNote = item.content_type === "text" && item.text_content && item.text_content.length >= 200;
  const isMedia = item.content_type === "photo" || item.content_type === "video";

  async function handleInspire() {
    if (!isValidToken(token)) {
      setInspireError(t("feed.signInToInspire"));
      return;
    }
    setInspireError(null);
    setInspireLoading(true);
    try {
      const res = await fetch(`${API_BASE}/pins/${item.id}/inspire`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (res.status === 429) {
        setShowLimitModal(true);
        return;
      }
      if (!res.ok) {
        let errMsg = t("feed.inspireFailed", "Не удалось. Попробуйте снова или войдите.");
        try {
          const err = await res.json();
          const d = typeof err?.detail === "string" ? err.detail : Array.isArray(err?.detail) ? err.detail[0]?.msg : null;
          if (d) errMsg = d === "Not authenticated" ? t("feed.signInToInspire") : d;
        } catch {
          errMsg = res.status === 401 ? t("feed.signInToInspire", "Войдите, чтобы вдохновиться") : t("feed.inspireFailed", "Не удалось. Попробуйте снова или войдите.");
        }
        setInspireError(errMsg);
        return;
      }
      onInspire?.(item.id, item.inspiration_count + 1);
    } catch {
      setInspireError(t("feed.inspireFailed", "Не удалось. Попробуйте снова или войдите."));
    } finally {
      setInspireLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="focus-mode-backdrop"
        onClick={onClose}
        aria-hidden
      />
      <div className="focus-mode-content">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="focus-mode-parchment max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-700 hover:text-gray-900 text-2xl font-bold w-8 h-8 flex items-center justify-center bg-amber-100/50 rounded-full hover:bg-amber-200/50"
            aria-label="Close"
          >
            ×
          </button>
          <div className="mb-4">
            <Link
              href={`/profile/${encodeURIComponent(item.username)}`}
              className="font-cinzel text-amber-700 hover:text-amber-900"
            >
              {item.username}
            </Link>
            <span className="text-gray-500 text-sm ml-2 font-special-elite">
              {item.inspiration_count} {t("pins.inspirations")}
            </span>
          </div>
          {isQuote && (
            <div className="moment-quote">
              <p className="text-2xl font-pinyon-script text-gray-900">{item.text_content}</p>
            </div>
          )}
          {isNote && (
            <div className="moment-note transform-none">
              <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">{item.text_content}</p>
            </div>
          )}
          {isMedia && (
            <div>
              {item.content_type === "photo" && item.content_url && (
                <img src={item.content_url} alt="" className="w-full h-auto rounded-lg shadow-lg" />
              )}
              {item.content_type === "video" && item.content_url && (
                <video src={item.content_url} className="w-full h-auto rounded-lg shadow-lg" controls autoPlay />
              )}
            </div>
          )}
          {!isQuote && !isNote && !isMedia && (
            <p className="text-gray-600">{t("moments.unknownContentType")}</p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleInspire}
              disabled={inspireLoading}
              className="px-4 py-2 bg-[#d4af37] text-gray-900 font-cinzel font-medium hover:bg-[#b8860b] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {inspireLoading ? "..." : t("pins.inspire")}
            </button>
            <Link
              href={`/pins/${item.id}`}
              className="inline-block px-4 py-2 bg-amber-600 text-white font-cinzel hover:bg-amber-500"
            >
              {t("feed.viewPin")}
            </Link>
            {inspireError && <span className="text-red-600 text-sm font-special-elite">{inspireError}</span>}
          </div>
        </motion.div>
      </div>
      {showLimitModal && (
        <InspirationalModal
          message="Go and build something worthy of your own journey."
          onClose={() => setShowLimitModal(false)}
        />
      )}
    </motion.div>
  );
}
