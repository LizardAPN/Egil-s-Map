"use client";

import Link from "next/link";
import type { MemoryPinMapItem } from "@imprint/api/browser";
import { Button } from "../ui/Button";

interface MapBottomSheetProps {
  pin: MemoryPinMapItem | null;
  onClose: () => void;
}

export function MapBottomSheet({ pin, onClose }: MapBottomSheetProps) {
  if (!pin) {
    return null;
  }

  const chapterColor = pin.chapter?.color ?? "#38bdf8";

  return (
    <div className="app-bottom-sheet" role="dialog" aria-label="Memory preview">
      <button type="button" className="app-sheet-close" onClick={onClose} aria-label="Close preview">
        ×
      </button>
      {pin.thumbnailUrl ? (
        <img src={pin.thumbnailUrl} alt="" className="app-sheet-thumb" />
      ) : (
        <div className="app-sheet-thumb app-sheet-thumb-empty" style={{ borderColor: chapterColor }} />
      )}
      <div className="app-sheet-body">
        <p className="app-sheet-kicker" style={{ color: chapterColor }}>
          {pin.chapter?.title ?? "Memory"}
        </p>
        <h2>{pin.title}</h2>
        {pin.body ? <p className="app-muted">{pin.body}</p> : null}
        <div className="app-sheet-actions">
          <Link href={`/pin/${pin.id}`}>
            <Button>Open</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
