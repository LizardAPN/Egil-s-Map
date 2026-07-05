"use client";

import {
  buildOptimisticMemoryPin,
  createMemoryPin,
  removeOptimisticMemoryPinFromQueries,
  replaceOptimisticMemoryPinInQueries,
  updateMemoryPinQueriesOptimistically,
  useUserChapters,
  type CreateMemoryPinInput,
  type LocalMediaAsset
} from "@imprint/api/pins";
import type { MemoryPin } from "@imprint/types";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMemoryMapStore } from "../../store/memory-map-store";
import { Button } from "../ui/Button";

interface CreatePinFormProps {
  latitude: number;
  longitude: number;
}

export function CreatePinForm({ latitude, longitude }: CreatePinFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: chapters = [] } = useUserChapters();
  const addOptimisticPin = useMemoryMapStore((state) => state.addOptimisticPin);
  const replaceOptimisticPin = useMemoryMapStore((state) => state.replaceOptimisticPin);
  const removeOptimisticPin = useMemoryMapStore((state) => state.removeOptimisticPin);
  const queueFocusTarget = useMemoryMapStore((state) => state.queueFocusTarget);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<MemoryPin["visibility"]>("private");
  const [chapterId, setChapterId] = useState<string>("");
  const [mediaAssets, setMediaAssets] = useState<LocalMediaAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const location = useMemo(
    () => ({ latitude, longitude }),
    [latitude, longitude]
  );

  const handleFiles = (files: FileList | null) => {
    if (!files) {
      return;
    }

    const nextAssets = [...mediaAssets];
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      nextAssets.push({
        uri: URL.createObjectURL(file),
        type: isVideo ? "video" : "image",
        fileName: file.name,
        mimeType: file.type,
        file
      });
    }
    setMediaAssets(nextAssets);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Give your memory a title.");
      return;
    }

    setError(null);
    setIsSaving(true);
    const temporaryId = `temp-${Date.now()}`;
    const input: CreateMemoryPinInput = {
      title,
      body,
      pinnedAt: new Date().toISOString(),
      visibility,
      location,
      mediaAssets,
      chapterId: chapterId || undefined
    };

    const optimistic = buildOptimisticMemoryPin(
      input,
      temporaryId,
      chapters.find((chapter) => chapter.id === chapterId) ?? null
    );

    addOptimisticPin(optimistic);
    updateMemoryPinQueriesOptimistically(queryClient, optimistic);

    try {
      const result = await createMemoryPin(input);
      replaceOptimisticPin(temporaryId, result.pin);
      replaceOptimisticMemoryPinInQueries(queryClient, temporaryId, result.pin);
      queueFocusTarget({ pinId: result.pin.id, coordinates: result.pin.location });
      router.push("/map");
    } catch {
      removeOptimisticPin(temporaryId);
      removeOptimisticMemoryPinFromQueries(queryClient, temporaryId);
      setError("Couldn't save your memory. Try again?");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="app-page">
      <h1>Drop a memory</h1>
      <p className="app-muted">
        {latitude.toFixed(4)}, {longitude.toFixed(4)}
      </p>

      <label className="app-field">
        <span>Title</span>
        <input value={title} onChange={(event) => { setTitle(event.target.value); }} maxLength={80} />
      </label>

      <label className="app-field">
        <span>Story</span>
        <textarea value={body} onChange={(event) => { setBody(event.target.value); }} rows={4} maxLength={500} />
      </label>

      <label className="app-field">
        <span>Visibility</span>
        <select
          value={visibility}
          onChange={(event) => { setVisibility(event.target.value as MemoryPin["visibility"]); }}
        >
          <option value="private">Private</option>
          <option value="friends">Friends</option>
          <option value="public">Public</option>
        </select>
      </label>

      <label className="app-field">
        <span>Chapter</span>
        <select value={chapterId} onChange={(event) => { setChapterId(event.target.value); }}>
          <option value="">No chapter</option>
          {chapters.map((chapter) => (
            <option key={chapter.id} value={chapter.id}>
              {chapter.title}
            </option>
          ))}
        </select>
      </label>

      <label className="app-field">
        <span>Photos / video</span>
        <input type="file" accept="image/*,video/*" multiple onChange={(event) => { handleFiles(event.target.files); }} />
      </label>

      {error ? (
        <p className="app-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="app-auth-actions">
        <Button disabled={isSaving} onClick={handleSave}>
          Save memory
        </Button>
        <Button variant="secondary" disabled={isSaving} onClick={() => { router.back(); }}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
