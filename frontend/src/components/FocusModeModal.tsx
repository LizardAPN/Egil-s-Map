"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { Moment } from "./MomentCard";

type FocusModeModalProps = {
  moment: Moment | null;
  onClose: () => void;
};

export default function FocusModeModal({ moment, onClose }: FocusModeModalProps) {
  const { t } = useTranslation("common");

  const isQuote = moment?.content_type === "text" && moment?.text_content && moment.text_content.length < 200;
  const isNote = moment?.content_type === "text" && moment?.text_content && moment.text_content.length >= 200;
  const isMedia = moment?.content_type === "photo" || moment?.content_type === "video";

  return (
    <AnimatePresence mode="wait">
      {moment ? (
        <motion.div
          key={moment.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="focus-mode-wrapper"
          style={{ position: "fixed", inset: 0, zIndex: 50 }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="focus-mode-backdrop"
            onClick={onClose}
            aria-hidden
          />
          <div className="focus-mode-content">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className="focus-mode-parchment"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-700 hover:text-gray-900 text-2xl font-bold w-8 h-8 flex items-center justify-center bg-amber-100/50 rounded-full hover:bg-amber-200/50 transition-colors"
            aria-label="Close"
          >
            ×
          </button>

          {isQuote && (
            <div className="moment-quote max-w-3xl mx-auto">
              <p className="text-3xl text-gray-900 font-pinyon-script relative z-10 text-center">
                {moment.text_content}
              </p>
            </div>
          )}

          {isNote && (
            <div className="moment-note max-w-2xl mx-auto transform-none">
              <p className="text-gray-900 text-base leading-relaxed whitespace-pre-wrap">
                {moment.text_content}
              </p>
            </div>
          )}

          {isMedia && (
            <div className="max-w-4xl mx-auto">
              {moment.content_type === "photo" && moment.content_url && (
                <img
                  src={moment.content_url}
                  alt="Moment"
                  className="w-full h-auto rounded-lg shadow-lg"
                />
              )}
              {moment.content_type === "video" && moment.content_url && (
                <video
                  src={moment.content_url}
                  className="w-full h-auto rounded-lg shadow-lg"
                  controls
                  autoPlay
                />
              )}
              {moment.is_private && (
                <div className="mt-4 text-center text-gray-700 font-cinzel text-sm">
                  {t("moments.privateMoment")}
                </div>
              )}
            </div>
          )}

          {!isQuote && !isNote && !isMedia && (
            <div className="max-w-2xl mx-auto">
              <p className="text-gray-700">{t("moments.unknownContentType")}</p>
            </div>
          )}
          </motion.div>
        </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
