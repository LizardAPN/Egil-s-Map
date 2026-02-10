"use client";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export type Chapter = {
  id: number;
  title: string;
  order: number;
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
            className={`chapter-tab ${selectedChapterId === chapter.id ? "active" : ""}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
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
