"use client";

import { motion } from "framer-motion";

export type Moment = {
  id: number;
  content_type: string;
  content_url: string | null;
  text_content: string | null;
  is_private: boolean;
};

type MomentCardProps = {
  moment: Moment;
  onMomentClick: (moment: Moment) => void;
};

export default function MomentCard({ moment, onMomentClick }: MomentCardProps) {
  const isQuote = moment.content_type === "text" && moment.text_content && moment.text_content.length < 200;
  const isNote = moment.content_type === "text" && moment.text_content && moment.text_content.length >= 200;
  const isMedia = moment.content_type === "photo" || moment.content_type === "video";

  return (
    <motion.div
      className="masonry-item"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      onClick={() => onMomentClick(moment)}
    >
      {isQuote && (
        <div className="moment-quote cursor-pointer hover:bg-amber-900/20 transition-colors">
          <p className="text-xl text-gray-200 font-pinyon-script relative z-10">
            {moment.text_content}
          </p>
        </div>
      )}

      {isNote && (
        <div className="moment-note cursor-pointer hover:rotate-0 hover:scale-105 transition-transform">
          <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
            {moment.text_content}
          </p>
        </div>
      )}

      {isMedia && (
        <div className="moment-media torn-edge-media cursor-pointer hover:opacity-90 transition-opacity">
          {moment.content_type === "photo" && moment.content_url && (
            <img
              src={moment.content_url}
              alt="Moment"
              className="w-full h-auto"
            />
          )}
          {moment.content_type === "video" && moment.content_url && (
            <video
              src={moment.content_url}
              className="w-full h-auto"
              controls={false}
            />
          )}
          {moment.is_private && (
            <div className="absolute top-2 right-2 bg-black/50 text-amber-400 px-2 py-1 rounded text-xs font-cinzel">
              Private
            </div>
          )}
        </div>
      )}

      {!isQuote && !isNote && !isMedia && (
        <div className="p-4 bg-gray-800/50 border border-gray-700 rounded cursor-pointer hover:bg-gray-800/70 transition-colors">
          <p className="text-gray-400 text-sm">Unknown content type</p>
        </div>
      )}
    </motion.div>
  );
}
