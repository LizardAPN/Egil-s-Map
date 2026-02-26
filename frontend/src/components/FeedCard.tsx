"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useTranslation } from "react-i18next";

export type FeedItem = {
  id: number;
  content_type: string;
  content_url: string | null;
  text_content: string | null;
  inspiration_count: number;
  username: string;
  created_at: string;
};

type FeedCardProps = {
  item: FeedItem;
  onCardClick?: (item: FeedItem) => void;
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export default function FeedCard({ item, onCardClick }: FeedCardProps) {
  const { t } = useTranslation("common");
  const isQuote = item.content_type === "text" && item.text_content && item.text_content.length < 200;
  const isNote = item.content_type === "text" && item.text_content && item.text_content.length >= 200;
  const isMedia = item.content_type === "photo" || item.content_type === "video";

  const handleClick = () => {
    if (onCardClick) onCardClick(item);
    else window.location.href = `/pins/${item.id}`;
  };

  return (
    <motion.article
      className="feed-card group"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={handleClick}
    >
      <div className="feed-card-parchment">
        {/* Pin/thumbtack decoration */}
        <div className="feed-card-pin" aria-hidden />

        {isQuote && (
          <div className="feed-card-quote">
            <p className="font-pinyon-script text-xl text-gray-800">
              {item.text_content}
            </p>
          </div>
        )}

        {isNote && (
          <div className="feed-card-note">
            <p className="font-special-elite text-gray-800 text-sm leading-relaxed whitespace-pre-wrap line-clamp-6">
              {item.text_content}
            </p>
          </div>
        )}

        {isMedia && (
          <div className="feed-card-media">
            {item.content_type === "photo" && item.content_url && (
              <img src={item.content_url} alt="" className="w-full h-auto block" />
            )}
            {item.content_type === "video" && item.content_url && (
              <video src={item.content_url} className="w-full h-auto block" muted playsInline />
            )}
          </div>
        )}

        {!isQuote && !isNote && !isMedia && (
          <div className="feed-card-unknown p-4">
            <p className="text-gray-500 text-sm font-special-elite">{t("moments.unknownContentType")}</p>
          </div>
        )}

        {/* Footer: author, date, inspirations */}
        <footer className="feed-card-footer">
          <Link
            href={`/profile/${encodeURIComponent(item.username)}`}
            className="feed-card-author font-cinzel text-amber-800 hover:text-amber-900"
            onClick={(e) => e.stopPropagation()}
          >
            {item.username}
          </Link>
          <span className="feed-card-meta">
            {formatDate(item.created_at)}
            {item.inspiration_count > 0 && (
              <span className="feed-card-inspirations"> · {item.inspiration_count} {t("pins.inspirations")}</span>
            )}
          </span>
        </footer>
      </div>
    </motion.article>
  );
}
