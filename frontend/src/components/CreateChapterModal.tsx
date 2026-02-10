"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { isValidToken } from "@/lib/api";

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type CreateChapterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  token?: string;
  existingChaptersCount: number;
};

export default function CreateChapterModal({
  isOpen,
  onClose,
  onCreated,
  token,
  existingChaptersCount,
}: CreateChapterModalProps) {
  const { t } = useTranslation("common");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidToken(token) || !title.trim()) {
      setError("Please enter a chapter title");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const body: { title: string; order: number; lat?: number; lng?: number } = {
        title: title.trim(),
        order: existingChaptersCount,
      };
      if (location) {
        body.lat = location.lat;
        body.lng = location.lng;
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
                disabled={loading || !title.trim()}
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
