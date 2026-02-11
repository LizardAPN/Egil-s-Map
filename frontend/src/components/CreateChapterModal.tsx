"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { isValidToken } from "@/lib/api";

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type ChapterOption = { id: number; title: string; order: number };

type CreateChapterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  token?: string;
  existingChapters: ChapterOption[];
};

/** YYYY-MM for max attribute on month inputs (no future) */
function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Convert YYYY-MM to ISO string (first day of month, UTC) */
function monthToISO(ym: string): string {
  if (!ym) return "";
  return new Date(ym + "-01T00:00:00Z").toISOString();
}

export default function CreateChapterModal({
  isOpen,
  onClose,
  onCreated,
  token,
  existingChapters,
}: CreateChapterModalProps) {
  const { t } = useTranslation("common");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCurrentChapter, setIsCurrentChapter] = useState(true);
  const [insertBeforeId, setInsertBeforeId] = useState<number | null>(null);
  const [startedMonth, setStartedMonth] = useState(""); // YYYY-MM
  const [endedMonth, setEndedMonth] = useState(""); // YYYY-MM

  const maxMonth = thisMonth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidToken(token) || !title.trim()) {
      setError("Please enter a chapter title");
      return;
    }
    if (!isCurrentChapter && (!startedMonth || !endedMonth)) {
      setError(t("profile.enterPeriodForCompleted"));
      return;
    }
    if (!isCurrentChapter && startedMonth && endedMonth && startedMonth > endedMonth) {
      setError(t("profile.startBeforeEnd"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const body: {
        title: string;
        order: number;
        lat?: number;
        lng?: number;
        started_at?: string;
        ended_at?: string;
        insert_before_id?: number;
      } = {
        title: title.trim(),
        order: existingChapters.length,
      };
      if (location) {
        body.lat = location.lat;
        body.lng = location.lng;
      }
      if (insertBeforeId !== null) {
        body.insert_before_id = insertBeforeId;
      }
      if (startedMonth) {
        body.started_at = monthToISO(startedMonth);
      }
      if (!isCurrentChapter && endedMonth) {
        body.ended_at = monthToISO(endedMonth);
      }
      const res = await fetch(`${API_BASE}/beacon`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setTitle("");
        setLocation(null);
        setIsCurrentChapter(true);
        setInsertBeforeId(null);
        setStartedMonth("");
        setEndedMonth("");
        onCreated();
        onClose();
      } else {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        const msg = Array.isArray(err.detail)
          ? err.detail.map((e: { msg?: string }) => e.msg || JSON.stringify(e)).join("; ")
          : err.detail || "Failed to create chapter";
        setError(msg);
      }
    } catch (err) {
      console.error("Failed to create chapter:", err);
      setError("Failed to create chapter. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-[#1a1a1e] border-2 border-[#3a3a3e] rounded-lg shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] p-6 torn-paper-clip"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-2xl font-bold text-amber-400 font-cinzel mb-4">
            {t("profile.createNewChapter")}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2 font-special-elite">
                {t("profile.chapterTitle")}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError(null);
                }}
                placeholder={t("profile.chapterTitlePlaceholder")}
                className="w-full px-4 py-2 bg-[#0a0a0c] border border-gray-600 focus:border-[#d4af37] font-special-elite text-gray-200 rounded"
                autoFocus
                disabled={loading}
              />
            </div>

            {existingChapters.length > 0 && (
              <div>
                <label className="block text-sm text-gray-400 mb-2 font-special-elite">
                  {t("profile.insertBefore")}
                </label>
                <select
                  value={insertBeforeId ?? ""}
                  onChange={(e) => setInsertBeforeId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-2 bg-[#0a0a0c] border border-gray-600 focus:border-[#d4af37] font-special-elite text-gray-200 rounded"
                  disabled={loading}
                >
                  <option value="">{t("profile.appendAtEnd")}</option>
                  {existingChapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.title}
                    </option>
                  ))}
                </select>
                <p className="text-gray-500 text-xs mt-1 font-special-elite">
                  {t("profile.insertBeforeHint")}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-2 font-special-elite">
                {t("profile.chapterPeriod")}
              </label>
              <div className="flex gap-4 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="chapterType"
                    checked={isCurrentChapter}
                    onChange={() => {
                      setIsCurrentChapter(true);
                      setEndedMonth("");
                      setError(null);
                    }}
                    className="accent-amber-500"
                  />
                  <span>{t("profile.currentChapter")}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="chapterType"
                    checked={!isCurrentChapter}
                    onChange={() => setIsCurrentChapter(false)}
                    className="accent-amber-500"
                  />
                  <span>{t("profile.completedChapter")}</span>
                </label>
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div className="min-w-[140px]">
                  <label className="block text-xs text-gray-500 mb-1 font-special-elite">
                    {isCurrentChapter ? t("profile.startedMonth") : t("profile.fromMonth")}
                  </label>
                  <input
                    type="month"
                    value={startedMonth}
                    onChange={(e) => {
                      setStartedMonth(e.target.value);
                      setError(null);
                    }}
                    max={maxMonth}
                    className="w-full px-4 py-2 bg-[#0a0a0c] border border-gray-600 focus:border-[#d4af37] font-special-elite text-gray-200 rounded"
                    disabled={loading}
                  />
                </div>
                {!isCurrentChapter ? (
                  <div className="min-w-[140px]">
                    <label className="block text-xs text-gray-500 mb-1 font-special-elite">
                      {t("profile.toMonth")}
                    </label>
                    <input
                      type="month"
                      value={endedMonth}
                      onChange={(e) => {
                        setEndedMonth(e.target.value);
                        setError(null);
                      }}
                      max={maxMonth}
                      min={startedMonth || undefined}
                      className="w-full px-4 py-2 bg-[#0a0a0c] border border-gray-600 focus:border-[#d4af37] font-special-elite text-gray-200 rounded"
                      disabled={loading}
                    />
                  </div>
                ) : (
                  <span className="text-gray-500 text-sm font-special-elite pb-2">
                    — {t("profile.ongoing")}
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-xs mt-1 font-special-elite">
                {t("profile.periodHint")}
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2 font-special-elite">
                {t("profile.chapterLocation")}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMapPickerOpen(true)}
                  disabled={loading}
                  className="px-4 py-2 bg-[#0a0a0c] border border-gray-600 hover:border-[#d4af37] font-special-elite text-gray-200 rounded transition-colors disabled:opacity-50"
                >
                  {location
                    ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                    : t("profile.pickOnMap")}
                </button>
                {location && (
                  <button
                    type="button"
                    onClick={() => setLocation(null)}
                    disabled={loading}
                    className="text-gray-500 hover:text-gray-300 text-sm"
                  >
                    {t("profile.clear")}
                  </button>
                )}
              </div>
              <p className="text-gray-500 text-xs mt-1 font-special-elite">
                {t("profile.chapterLocationHint")}
              </p>
            </div>

            {error && (
              <div className="text-red-400 text-sm font-special-elite">{error}</div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2 bg-gray-700 text-gray-200 hover:bg-gray-600 font-cinzel rounded transition-colors disabled:opacity-50"
              >
                {t("profile.cancel")}
              </button>
              <button
                type="submit"
                disabled={
                  loading ||
                  !title.trim() ||
                  (!isCurrentChapter && (!startedMonth || !endedMonth))
                }
                className="flex-1 py-2 bg-[#d4af37] text-gray-900 hover:bg-[#b8860b] hover:brightness-110 font-cinzel font-medium rounded transition-colors disabled:opacity-50"
              >
                {loading ? t("profile.creating") : t("profile.createChapter")}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>

      <MapPicker
        open={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        onPick={(lat, lng) => {
          setLocation({ lat, lng });
          setMapPickerOpen(false);
        }}
        initialLat={location?.lat ?? 55.75}
        initialLng={location?.lng ?? 37.62}
      />
    </AnimatePresence>
  );
}
