"use client";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("common");
  return (
    <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
      <div className="flex gap-2 min-w-max px-4">
        <button
          onClick={() => onChapterSelect(null)}
          className={`chapter-tab ${selectedChapterId === null ? "active" : ""}`}
        >
          {t("profile.allChapters")}
        </button>
        {chapters.map((chapter) => (
          <motion.button
            key={chapter.id}
            onClick={() => onChapterSelect(chapter.id)}
            className={`chapter-tab ${selectedChapterId === chapter.id ? "active" : ""} ${chapter.is_active ? "chapter-tab-current" : ""}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={chapter.is_active ? t("profile.currentChapter") : t("profile.completedChapter")}
          >
            {chapter.is_active && (
              <svg className="w-4 h-4 inline-block mr-1.5 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 23c-1.66 0-3-1.34-3-3 0-.74.4-1.38 1-1.72V3h2v15.28c.6.34 1 .98 1 1.72 0 1.66-1.34 3-3 3z" />
              </svg>
            )}
            {chapter.title}
          </motion.button>
        ))}
      </div>
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
