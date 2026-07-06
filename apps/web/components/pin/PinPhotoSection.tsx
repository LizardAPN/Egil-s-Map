"use client";

import {
  IconPhoto,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type DragEvent,
} from "react";

import {
  createBrowserClient,
  deletePinMedia,
  reorderPinMedia,
  uploadPinMedia,
  type UploadProgress,
} from "@imprint/api";
import type { PinMedia } from "@imprint/types";
import { Spinner, cn } from "@imprint/ui";

import { BlurImage } from "../media/BlurImage";

const MAX_PHOTOS = 10;

type UploadPhase = UploadProgress["phase"];

interface StagedItem {
  kind: "staged";
  id: string;
  file: File;
  previewUrl: string;
}

interface UploadingItem {
  kind: "uploading";
  id: string;
  file: File;
  previewUrl: string;
  phase: UploadPhase;
}

interface UploadedItem {
  kind: "uploaded";
  media: PinMedia;
}

interface ErrorItem {
  kind: "error";
  id: string;
  file: File;
  previewUrl: string;
}

type PhotoItem = StagedItem | UploadingItem | UploadedItem | ErrorItem;

export interface PinPhotoSectionHandle {
  getStagedFiles: () => File[];
}

export interface PinPhotoSectionProps {
  pinId: string | null;
  initialMedia?: PinMedia[];
  onDirty: () => void;
}

function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

function countItems(items: PhotoItem[]): number {
  return items.length;
}

function getItemKey(item: PhotoItem): string {
  return item.kind === "uploaded" ? item.media.id : item.id;
}

export const PinPhotoSection = forwardRef<
  PinPhotoSectionHandle,
  PinPhotoSectionProps
>(function PinPhotoSection({ pinId, initialMedia, onDirty }, ref) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const initializedPinIdRef = useRef<string | null>(null);

  useImperativeHandle(ref, () => ({
    getStagedFiles: () =>
      items
        .filter((item): item is StagedItem => item.kind === "staged")
        .map((item) => item.file),
  }));

  useEffect(() => {
    if (!pinId || !initialMedia) {
      return;
    }

    if (initializedPinIdRef.current === pinId) {
      return;
    }

    initializedPinIdRef.current = pinId;
    setItems(
      initialMedia.map((media) => ({
        kind: "uploaded" as const,
        media,
      })),
    );
  }, [pinId, initialMedia]);

  useEffect(() => {
    return () => {
      for (const item of items) {
        if (item.kind !== "uploaded") {
          URL.revokeObjectURL(item.previewUrl);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup preview URLs on unmount
  }, []);

  const totalCount = countItems(items);
  const canAddMore = totalCount < MAX_PHOTOS;

  const uploadFiles = useCallback(
    async (files: File[], replaceErrorId?: string) => {
      if (!pinId) {
        return;
      }

      const supabase = createBrowserClient();
      const availableSlots = MAX_PHOTOS - totalCount + (replaceErrorId ? 1 : 0);
      const batch = files.slice(0, availableSlots);

      for (const file of batch) {
        const itemId = crypto.randomUUID();
        const previewUrl = createPreviewUrl(file);

        setItems((current) => {
          const withoutReplaced = replaceErrorId
            ? current.filter((item) => getItemKey(item) !== replaceErrorId)
            : current;

          return [
            ...withoutReplaced,
            {
              kind: "uploading" as const,
              id: itemId,
              file,
              previewUrl,
              phase: "preparing" as const,
            },
          ];
        });

        try {
          const [created] = await uploadPinMedia(supabase, pinId, [file], (progress) => {
            setItems((current) =>
              current.map((item) =>
                item.kind === "uploading" && item.id === itemId
                  ? { ...item, phase: progress.phase }
                  : item,
              ),
            );
          });

          if (!created) {
            throw new Error("Upload failed");
          }

          URL.revokeObjectURL(previewUrl);

          setItems((current) =>
            current.map((item) =>
              item.kind === "uploading" && item.id === itemId
                ? { kind: "uploaded" as const, media: created }
                : item,
            ),
          );
          onDirty();
        } catch {
          setItems((current) =>
            current.map((item) =>
              item.kind === "uploading" && item.id === itemId
                ? {
                    kind: "error" as const,
                    id: itemId,
                    file,
                    previewUrl,
                  }
                : item,
            ),
          );
        }
      }
    },
    [onDirty, pinId, totalCount],
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files).filter((file) =>
        file.type.startsWith("image/"),
      );

      if (list.length === 0) {
        return;
      }

      onDirty();

      if (pinId) {
        void uploadFiles(list);
        return;
      }

      const availableSlots = MAX_PHOTOS - totalCount;
      const batch = list.slice(0, availableSlots);

      setItems((current) => [
        ...current,
        ...batch.map((file) => ({
          kind: "staged" as const,
          id: crypto.randomUUID(),
          file,
          previewUrl: createPreviewUrl(file),
        })),
      ]);
    },
    [onDirty, pinId, totalCount, uploadFiles],
  );

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      addFiles(event.target.files);
      event.target.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();

    if (!canAddMore) {
      return;
    }

    if (event.dataTransfer.files.length > 0) {
      addFiles(event.dataTransfer.files);
    }
  }

  async function handleRemove(index: number) {
    const item = items[index];

    if (!item) {
      return;
    }

    if (item.kind === "uploaded") {
      const supabase = createBrowserClient();
      await deletePinMedia(supabase, item.media);
    } else {
      URL.revokeObjectURL(item.previewUrl);
    }

    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
    onDirty();
  }

  async function persistReorder(nextItems: PhotoItem[]) {
    if (!pinId) {
      return;
    }

    const uploadedIds = nextItems
      .filter((item): item is UploadedItem => item.kind === "uploaded")
      .map((item) => item.media.id);

    if (uploadedIds.length === 0) {
      return;
    }

    const supabase = createBrowserClient();
    await reorderPinMedia(supabase, pinId, uploadedIds);
    onDirty();
  }

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>, index: number) {
    event.preventDefault();
    setDragOverIndex(index);
  }

  function handleDropOnThumb(event: DragEvent<HTMLDivElement>, index: number) {
    event.preventDefault();
    setDragOverIndex(null);

    const fromIndex = dragIndexRef.current;

    if (fromIndex === null || fromIndex === index) {
      return;
    }

    const fromItem = items[fromIndex];
    const toItem = items[index];

    if (
      !fromItem ||
      !toItem ||
      fromItem.kind !== "uploaded" ||
      toItem.kind !== "uploaded"
    ) {
      return;
    }

    const nextItems = [...items];
    const [moved] = nextItems.splice(fromIndex, 1);

    if (!moved) {
      return;
    }

    nextItems.splice(index, 0, moved);
    setItems(nextItems);
    void persistReorder(nextItems);
  }

  function renderThumb(item: PhotoItem, index: number) {
    const isUploaded = item.kind === "uploaded";
    const isError = item.kind === "error";
    const isUploading = item.kind === "uploading";

    return (
      <div
        key={isUploaded ? item.media.id : item.id}
        draggable={isUploaded}
        onDragStart={() => {
          handleDragStart(index);
        }}
        onDragOver={(event) => {
          handleDragOver(event, index);
        }}
        onDrop={(event) => {
          handleDropOnThumb(event, index);
        }}
        onDragEnd={() => {
          dragIndexRef.current = null;
          setDragOverIndex(null);
        }}
        className={cn(
          "group relative size-16 shrink-0 overflow-hidden rounded-control",
          isError && "ring-2 ring-danger",
          dragOverIndex === index && "ring-2 ring-amber",
        )}
      >
        {isUploaded ? (
          <BlurImage
            blurhash={item.media.blurhash}
            src={item.media.url}
            width={item.media.width}
            height={item.media.height}
            alt=""
            className="size-full"
          />
        ) : (
          <img
            src={item.previewUrl}
            alt=""
            className="size-full object-cover"
          />
        )}

        {isUploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-night-950/60">
            <Spinner size={16} />
          </div>
        ) : null}

        {isError ? (
          <button
            type="button"
            aria-label="Повторить загрузку"
            className="absolute inset-0 flex items-center justify-center bg-night-950/60"
            onClick={() => {
              void uploadFiles([item.file], item.id);
            }}
          >
            <IconRefresh size={18} className="text-ink-primary" />
          </button>
        ) : null}

        {!isUploading ? (
          <button
            type="button"
            aria-label="Удалить фото"
            className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-night-950/80 text-ink-primary opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => {
              void handleRemove(index);
            }}
          >
            <IconX size={12} />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-secondary">Фотографии</span>
        <span className="text-xs text-ink-muted">
          {totalCount}/{MAX_PHOTOS}
        </span>
      </div>

      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">{items.map(renderThumb)}</div>
      ) : null}

      {canAddMore ? (
        <button
          type="button"
          onClick={() => {
            fileInputRef.current?.click();
          }}
          onDrop={handleDrop}
          onDragOver={(event) => {
            event.preventDefault();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-control border border-dashed border-line bg-night-850 px-4 py-6 text-sm text-ink-secondary transition-colors hover:border-line-strong hover:text-ink-primary"
        >
          <IconPhoto size={18} stroke={1.5} aria-hidden />
          Перетащи фото или нажми
        </button>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
});
