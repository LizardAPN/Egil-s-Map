"use client";

import { useSession, signOut } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChapterBar, { type Chapter } from "@/components/ChapterBar";
import MomentCard, { type Moment } from "@/components/MomentCard";
import FocusModeModal from "@/components/FocusModeModal";
import PrivacyToggle from "@/components/PrivacyToggle";
import CreateChapterModal from "@/components/CreateChapterModal";
import { isValidToken, withLocale } from "@/lib/api";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { isValidLocale, type Locale } from "@/lib/i18n-utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type BeaconTier = {
  id: number;
  title: string;
  order: number;
  pins: {
    id: number;
    lat: number;
  lng: number;
    content_type: string;
    content_url: string | null;
    text_content: string | null;
    is_private: boolean;
  }[];
  chapter_summary?: string | null;
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const { i18n, t } = useTranslation("common");
  const locale: Locale = isValidLocale(i18n.language) ? i18n.language : "en";
  const router = useRouter();
  const [beaconData, setBeaconData] = useState<{
    current_is_star: boolean;
    tiers: BeaconTier[];
  } | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [focusedMoment, setFocusedMoment] = useState<Moment | null>(null);
  const [isProfilePrivate, setIsProfilePrivate] = useState(false);
  const [isCreateChapterOpen, setIsCreateChapterOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  function refreshBeaconData() {
    const username = session?.user?.name || "me";
    if (!username) return;
    const path = withLocale(`/profile/${encodeURIComponent(username)}/beacon`, locale);
    fetch(`${API_BASE}${path}`)
      .then((r) => r.json())
      .then(setBeaconData)
      .catch(() => setBeaconData({ current_is_star: false, tiers: [] }));
  }

  useEffect(() => {
    refreshBeaconData();
  }, [session?.user?.name, locale]);

  // Fetch privacy settings
  useEffect(() => {
    const token = (session as { accessToken?: string })?.accessToken;
    if (!isValidToken(token)) return;
    
    fetch(`${API_BASE}/profile/user/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setIsProfilePrivate(data.is_profile_private || false))
      .catch(() => setIsProfilePrivate(false));
  }, [session]);

  // Get all moments from all tiers
  const allMoments = useMemo(() => {
    if (!beaconData?.tiers) return [];
    return beaconData.tiers.flatMap((tier) =>
      tier.pins.map((pin) => ({
        id: pin.id,
        content_type: pin.content_type,
        content_url: pin.content_url,
        text_content: pin.text_content,
        is_private: pin.is_private,
      }))
    );
  }, [beaconData]);

  // Filter moments by selected chapter
  const filteredMoments = useMemo(() => {
    if (selectedChapterId === null) return allMoments;
    const selectedTier = beaconData?.tiers.find((t) => t.id === selectedChapterId);
    if (!selectedTier) return [];
    return selectedTier.pins.map((pin) => ({
      id: pin.id,
      content_type: pin.content_type,
      content_url: pin.content_url,
      text_content: pin.text_content,
      is_private: pin.is_private,
    }));
  }, [selectedChapterId, beaconData, allMoments]);

  // Get chapters for ChapterBar
  const chapters: Chapter[] = useMemo(() => {
    if (!beaconData?.tiers) return [];
    return beaconData.tiers.map((tier) => ({
      id: tier.id,
      title: tier.title,
      order: tier.order,
    }));
  }, [beaconData]);

  if (status === "loading") return <div className="p-8">Loading...</div>;

  const username = session?.user?.name || "me";
  const token = (session as { accessToken?: string })?.accessToken;

  return (
    <main className="min-h-screen chronicle-bg chronicle-vignette relative z-0">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-gray-900/50 backdrop-blur-md border-b border-amber-900/30 relative z-10">
        <Link href="/" className="text-xl font-bold text-amber-400 font-cinzel uppercase">
          Egil&apos;s Map
        </Link>
        <nav className="flex gap-4 font-cinzel uppercase items-center">
          <Link href="/map">{t("nav.map")}</Link>
          <Link href="/strongholds">{t("nav.strongholds")}</Link>
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-inherit hover:underline bg-transparent border-none cursor-pointer p-0 font-inherit"
          >
            {t("nav.signOut")}
          </button>
        </nav>
      </header>

      {/* Profile Header with Name and Privacy Toggle */}
      <div className="relative z-10 px-8 pt-8 pb-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-amber-400 font-cinzel">
            {t("profile.chronicleTitle", { username })}
          </h1>
          {isValidToken(token) && (
            <PrivacyToggle
              isPrivate={isProfilePrivate}
              onToggle={setIsProfilePrivate}
              token={token}
            />
          )}
        </div>

        {/* Chapter Bar */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <ChapterBar
              chapters={chapters}
              selectedChapterId={selectedChapterId}
              onChapterSelect={setSelectedChapterId}
            />
          </div>
          {isValidToken(token) && (
            <button
              onClick={() => setIsCreateChapterOpen(true)}
              className="px-4 py-2 bg-[#d4af37] text-gray-900 hover:bg-[#b8860b] hover:brightness-110 font-cinzel font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-2"
              title="Create a new chapter"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              {t("profile.newChapter")}
            </button>
          )}
        </div>
      </div>

      {/* Record a Deed Button */}
      {isValidToken(token) && (
        <div className="relative z-10 px-8 pb-4">
          <Link
            href="/create-pin"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#d4af37] text-gray-900 hover:bg-[#b8860b] hover:brightness-110 font-cinzel font-medium rounded-lg transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Quill & Ink Icon */}
              <path
                d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                fill="currentColor"
              />
              <path
                d="M5 19h1.5L18.5 6.5 17 5 5 17v2z"
                fill="currentColor"
                opacity="0.6"
              />
            </svg>
            {t("profile.recordDeed")}
          </Link>
        </div>
      )}

      {/* Moments Grid */}
      <div className="relative z-10 px-8 pb-8">
        {filteredMoments.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 font-special-elite text-lg">
              {selectedChapterId === null
                ? t("profile.noMomentsYet")
                : t("profile.noMomentsInChapter")}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedChapterId ?? "all"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="masonry-grid"
            >
              {filteredMoments.map((moment) => (
                <MomentCard
                  key={moment.id}
                  moment={moment}
                  onMomentClick={setFocusedMoment}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Focus Mode Modal */}
      <FocusModeModal moment={focusedMoment} onClose={() => setFocusedMoment(null)} />

      {/* Create Chapter Modal */}
      <CreateChapterModal
        isOpen={isCreateChapterOpen}
        onClose={() => setIsCreateChapterOpen(false)}
        onCreated={refreshBeaconData}
        token={token}
        existingChaptersCount={chapters.length}
      />
    </main>
  );
}
