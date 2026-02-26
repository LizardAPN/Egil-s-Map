"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { InspirationalModal } from "@/components/InspirationalModal";
import { isValidToken } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PinPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: session } = useSession();
  const { t } = useTranslation("common");
  const [pin, setPin] = useState<{
    id: number;
    content_type: string;
    content_url: string | null;
    text_content: string | null;
    inspiration_count: number;
  } | null>(null);
  const [inspireError, setInspireError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/pins/${id}`)
      .then((r) => r.json())
      .then(setPin)
      .catch(() => setPin(null));
  }, [id]);

  async function handleInspire() {
    const token = (session as { accessToken?: string })?.accessToken;
    if (!isValidToken(token)) {
      setInspireError(t("feed.signInToInspire"));
      return;
    }
    setInspireError(null);
    try {
      const r = await fetch(`${API_BASE}/pins/${id}/inspire`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (r.status === 429) {
        setShowModal(true);
        return;
      }
      if (!r.ok) {
        let errMsg = t("feed.inspireFailed");
        try {
          const err = await r.json();
          const d = typeof err?.detail === "string" ? err.detail : Array.isArray(err?.detail) ? err.detail[0]?.msg : null;
          if (d) errMsg = d === "Not authenticated" ? t("feed.signInToInspire") : d;
        } catch {
          errMsg = r.status === 401 ? t("feed.signInToInspire") : t("feed.inspireFailed");
        }
        setInspireError(errMsg);
        return;
      }
      if (pin) setPin({ ...pin, inspiration_count: pin.inspiration_count + 1 });
    } catch {
      setInspireError(t("feed.inspireFailed"));
    }
  }

  if (!pin) return <div className="p-8">Loading...</div>;

  return (
    <main className="min-h-screen p-8">
      <header className="mb-8">
        <Link href="/map" className="text-amber-400 hover:underline">
          ← Back to Map
        </Link>
      </header>
      <div className="max-w-2xl">
        <div className="mb-6">
          {pin.content_type === "photo" && pin.content_url && (
            <img src={pin.content_url} alt="Pin" className="rounded-lg w-full" />
          )}
          {pin.content_type === "video" && pin.content_url && (
            <video src={pin.content_url} controls className="rounded-lg w-full" />
          )}
          {pin.content_type === "text" && (
            <p className="text-gray-300 whitespace-pre-wrap">{pin.text_content}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-400">{pin.inspiration_count} inspirations</span>
          <button
            onClick={handleInspire}
            className="px-4 py-2 bg-[#d4af37] text-gray-900 font-cinzel font-medium hover:bg-[#b8860b] hover:brightness-110"
          >
            {t("pins.inspire")}
          </button>
          {inspireError && <span className="text-red-400">{inspireError}</span>}
        </div>
      </div>
      {showModal && (
        <InspirationalModal
          message="Go and build something worthy of your own journey."
          onClose={() => setShowModal(false)}
        />
      )}
    </main>
  );
}
