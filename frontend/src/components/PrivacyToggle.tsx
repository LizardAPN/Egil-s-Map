"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

type PrivacyToggleProps = {
  isPrivate: boolean;
  onToggle: (isPrivate: boolean) => void;
  token?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PrivacyToggle({ isPrivate: initialIsPrivate, onToggle, token }: PrivacyToggleProps) {
  const { t } = useTranslation("common");
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsPrivate(initialIsPrivate);
  }, [initialIsPrivate]);

  async function handleToggle() {
    if (!token) return;
    
    const newValue = !isPrivate;
    setLoading(true);
    
    try {
      const res = await fetch(`${API_BASE}/profile/user/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_profile_private: newValue }),
      });

      if (res.ok) {
        setIsPrivate(newValue);
        onToggle(newValue);
      } else {
        const error = await res.json().catch(() => ({ detail: "Failed to update privacy setting" }));
        console.error("Failed to update privacy:", error);
        alert(error.detail || "Failed to update privacy setting");
      }
    } catch (err) {
      console.error("Error updating privacy:", err);
      alert("Failed to update privacy setting");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading || !token}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title={isPrivate ? "Profile is Private (Wax Seal)" : "Profile is Public (Golden Eye)"}
    >
      {isPrivate ? (
        <motion.svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {/* Wax Seal Icon */}
          <circle cx="12" cy="12" r="8" fill="#8b4513" stroke="#654321" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="5" fill="#a0522d" />
          <path
            d="M12 7 L12 10 M12 14 L12 17 M7 12 L10 12 M14 12 L17 12"
            stroke="#d4af37"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </motion.svg>
      ) : (
        <motion.svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {/* Golden Eye Icon */}
          <ellipse cx="12" cy="12" rx="8" ry="6" fill="#d4af37" stroke="#b8860b" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="3" fill="#ffd700" />
          <circle cx="12" cy="12" r="1.5" fill="#654321" />
          <path
            d="M8 8 L6 6 M18 8 L20 6 M8 16 L6 18 M18 16 L20 18"
            stroke="#b8860b"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </motion.svg>
      )}
      <span className="text-sm font-cinzel text-amber-400">
        {isPrivate ? t("profile.private") : t("profile.public")}
      </span>
    </button>
  );
}
