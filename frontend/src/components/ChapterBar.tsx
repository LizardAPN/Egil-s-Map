"use client";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { formatChapterDateRange } from "@/lib/date-utils";
import { isValidLocale, type Locale } from "@/lib/i18n-utils";

export type Chapter = {
  id: number;
  title: string;
  order: number;
  started_at?: string | null;
  ended_at?: string | null;
  is_active?: boolean;
};

type ChapterBarProps = {
  chapters: Chapter[];
  selectedChapterId: number | null;
  onChapterSelect: (chapterId: number | null) => void;
};

export default function ChapterBar({
  chapters,
  selectedChapterId,
  onChapterSelect,
}: ChapterBarProps) {
  const { t, i18n } = useTranslation("common");
  const locale: Locale = isValidLocale(i18n.language) ? i18n.language : "en";
  return (
    <div className="w-full overflow-x-auto overflow-y-hidden pb-2 scroll-smooth chapter-bar-scroll">
      <div className="flex gap-2 min-w-max px-4">
        <button
          onClick={() => onChapterSelect(null)}
          className={`chapter-tab ${selectedChapterId === null ? "active" : ""}`}
        >
          {t("profile.allChapters")}
        </button>
        {chapters.map((chapter) => {
          const dateRange = formatChapterDateRange(
            chapter.started_at,
            chapter.ended_at,
            locale,
            t("map.present")
          );
          const tooltip = dateRange
            ? `${chapter.is_active ? t("profile.currentChapter") : t("profile.completedChapter")}: ${dateRange}`
            : chapter.is_active
              ? t("profile.currentChapter")
              : t("profile.completedChapter");
          return (
            <motion.button
              key={chapter.id}
              onClick={() => onChapterSelect(chapter.id)}
              className={`chapter-tab ${selectedChapterId === chapter.id ? "active" : ""} ${chapter.is_active ? "chapter-tab-current" : ""}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={tooltip}
            >
              <span className="flex flex-col items-start gap-0.5">
                <span className="flex items-center gap-1.5">
                  {chapter.is_active && (
                    <svg className="w-4 h-4 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M12 23c-1.66 0-3-1.34-3-3 0-.74.4-1.38 1-1.72V3h2v15.28c.6.34 1 .98 1 1.72 0 1.66-1.34 3-3 3z" />
                    </svg>
                  )}
                  <span>{chapter.title}</span>
                </span>
                {dateRange && (
                  <span className="text-xs opacity-80 font-special-elite">
                    {dateRange}
                  </span>
                )}
              </span>
            </motion.button>
          );
        })}
      </div>
      <style jsx>{`
        .chapter-bar-scroll {
          scroll-behavior: smooth;
          scrollbar-width: thin;
          scrollbar-color: rgba(212, 175, 55, 0.5) transparent;
        }
        .chapter-bar-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .chapter-bar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .chapter-bar-scroll::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.5);
          border-radius: 3px;
        }
        .chapter-bar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 175, 55, 0.7);
        }
      `}</style>
    </div>
  );
}
