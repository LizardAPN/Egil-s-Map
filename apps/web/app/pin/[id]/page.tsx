"use client";

import { useMemoryPinDetail } from "@imprint/api/browser";
import {
  useAddReaction,
  usePinReactionState,
  useRemoveReaction
} from "@imprint/api/reactions";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Spinner } from "../../../components/ui/Spinner";
import { Button } from "../../../components/ui/Button";

export default function PinDetailPage() {
  const params = useParams<{ id: string }>();
  const pinId = params.id;
  const { data: pin, isLoading, error } = useMemoryPinDetail(pinId);
  const { data: reactionState } = usePinReactionState(pinId);
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  if (isLoading) {
    return (
      <main className="app-page">
        <Spinner label="Loading memory…" />
      </main>
    );
  }

  if (error || !pin) {
    return (
      <main className="app-page">
        <p className="app-error">Couldn't load this memory.</p>
      </main>
    );
  }

  const handleReaction = async () => {
    if (reactionState?.reacted) {
      await removeReaction.mutateAsync(pinId);
      return;
    }
    await addReaction.mutateAsync(pinId);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({
        title: pin.title,
        ...(pin.body ? { text: pin.body } : {}),
        url
      });
      return;
    }
    await navigator.clipboard.writeText(url);
    setShareMessage("Link copied.");
  };

  return (
    <main className="app-page">
      <p className="app-muted">{pin.chapter?.title ?? "Memory"}</p>
      <h1>{pin.title}</h1>
      {pin.body ? <p>{pin.body}</p> : null}

      {pin.mediaUrls.length > 0 ? (
        <div className="app-card-grid">
          {pin.mediaUrls.map((url) => (
            <img key={url} src={url} alt="" className="app-sheet-thumb" style={{ width: "100%" }} />
          ))}
        </div>
      ) : null}

      <div className="app-auth-actions">
        <Button onClick={handleReaction}>
          {reactionState?.reacted ? "Unlike" : "Like"} ({reactionState?.count ?? 0})
        </Button>
        <Button variant="secondary" onClick={handleShare}>
          Share
        </Button>
      </div>
      {shareMessage ? <p className="app-muted">{shareMessage}</p> : null}
    </main>
  );
}
