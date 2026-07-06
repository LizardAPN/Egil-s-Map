"use client";

import { useQuery } from "@tanstack/react-query";
import {
  IconChevronLeft,
  IconChevronRight,
  IconHeart,
  IconMapPin,
  IconPencil,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { createBrowserClient, listPinMedia } from "@imprint/api";
import type { Pin, PinMedia } from "@imprint/types";
import {
  Button,
  Card,
  Dialog,
  Pill,
  Skeleton,
  cn,
} from "@imprint/ui";

import { useCurrentUser } from "../../hooks/use-current-user";
import { useDeletePin } from "../../hooks/use-delete-pin";
import { usePinDetail } from "../../hooks/use-pin-detail";
import { formatPinnedAt } from "../../lib/format-pinned-at";
import { pinKeys } from "../../lib/pin-keys";
import { VisibilityPill } from "../../lib/pin-visibility";
import { DEFAULT_CHAPTER_COLOR } from "../../lib/chapter-colors";
import { BlurImage } from "../media/BlurImage";

const SWIPE_THRESHOLD_PX = 40;

function PinCardSkeleton() {
  return (
    <Card className="overflow-hidden shadow-float">
      <Skeleton className="h-[180px] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </Card>
  );
}

function PinCardGallery({ pinId, alt }: { pinId: string; alt: string }) {
  const { data: media, isLoading } = useQuery({
    queryKey: pinKeys.media(pinId),
    queryFn: async () => {
      return listPinMedia(createBrowserClient(), pinId);
    },
  });

  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const items = (media ?? []).filter((item) => item.url.length > 0);
  const count = items.length;
  const current: PinMedia | undefined = items[index];

  useEffect(() => {
    setIndex(0);
  }, [pinId]);

  useEffect(() => {
    if (index >= count && count > 0) {
      setIndex(0);
    }
  }, [count, index]);

  const goPrev = useCallback(() => {
    setIndex((currentIndex) =>
      count === 0 ? 0 : (currentIndex - 1 + count) % count,
    );
  }, [count]);

  const goNext = useCallback(() => {
    setIndex((currentIndex) => (count === 0 ? 0 : (currentIndex + 1) % count));
  }, [count]);

  if (isLoading) {
    return <Skeleton className="h-[180px] w-full rounded-none" />;
  }

  if (count === 0) {
    return (
      <div className="flex h-[180px] w-full items-center justify-center bg-night-700">
        <IconMapPin size={32} stroke={1.5} className="text-ink-muted" aria-hidden />
      </div>
    );
  }

  return (
    <div
      className="relative h-[180px] w-full overflow-hidden bg-night-700"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null || count <= 1) {
          return;
        }

        const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
        const delta = endX - touchStartX.current;
        touchStartX.current = null;

        if (delta > SWIPE_THRESHOLD_PX) {
          goPrev();
        } else if (delta < -SWIPE_THRESHOLD_PX) {
          goNext();
        }
      }}
    >
      {current ? (
        <BlurImage
          src={current.url}
          blurhash={current.blurhash}
          width={current.width}
          height={current.height}
          alt={alt}
          className="h-[180px] w-full"
        />
      ) : null}

      {count > 1 ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-night-900/60 hover:bg-night-900/80"
            aria-label="Предыдущее фото"
            onClick={goPrev}
          >
            <IconChevronLeft size={16} stroke={1.5} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-night-900/60 hover:bg-night-900/80"
            aria-label="Следующее фото"
            onClick={goNext}
          >
            <IconChevronRight size={16} stroke={1.5} />
          </Button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {items.map((item, dotIndex) => (
              <span
                key={item.id}
                className={cn(
                  "size-1.5 rounded-full",
                  dotIndex === index ? "bg-amber" : "bg-night-500",
                )}
                aria-hidden
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function PinCardBody({
  pin,
  isOwner,
}: {
  pin: Pin;
  isOwner: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    setExpanded(false);
  }, [pin.id]);

  useLayoutEffect(() => {
    const element = bodyRef.current;

    if (!element || !pin.body) {
      setOverflows(false);
      return;
    }

    if (expanded) {
      return;
    }

    setOverflows(element.scrollHeight > element.clientHeight);
  }, [pin.body, pin.id, expanded]);

  const locationLabel =
    !isOwner && !pin.locationExact
      ? "примерное место"
      : pin.locationName?.trim() || null;

  return (
    <div className="space-y-2 px-4 pb-3">
      {pin.chapterId && pin.chapterTitle && pin.chapterColor ? (
        <Pill
          as="button"
          label={pin.chapterTitle}
          color={pin.chapterColor}
          className="text-xs"
          onClick={() => undefined}
        />
      ) : null}

      <h2 className="text-[15px] font-medium text-ink-primary">{pin.title}</h2>

      <p className="font-mono text-[11px] text-ink-secondary">
        {formatPinnedAt(pin.pinnedAt)}
        {locationLabel ? (
          <>
            {" · "}
            <span className="truncate">{locationLabel}</span>
          </>
        ) : null}
      </p>

      {pin.body ? (
        <div>
          <p
            ref={bodyRef}
            className={cn(
              "text-[13px] leading-[1.6] text-ink-body",
              !expanded && "line-clamp-4",
            )}
          >
            {pin.body}
          </p>
          {overflows || expanded ? (
            <button
              type="button"
              className="mt-1 text-xs text-amber hover:text-amber-bright"
              onClick={() => {
                setExpanded((value) => !value);
              }}
            >
              {expanded ? "Свернуть" : "Читать дальше"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export interface PinCardProps {
  pinId: string;
  onClose: () => void;
}

export function PinCard({ pinId, onClose }: PinCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: pin, isLoading } = usePinDetail(pinId);
  const { data: user } = useCurrentUser();
  const deletePinMutation = useDeletePin();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isOwner = Boolean(user && pin && user.id === pin.userId);

  const chapterColor =
    pin?.chapterColor ??
    (pin?.chapterId ? DEFAULT_CHAPTER_COLOR : undefined);

  function handleEdit() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("pin");
    params.set("editPin", pinId);
    const next = params.toString();
    router.push(next ? `${pathname}?${next}` : pathname);
  }

  function handleDeleteConfirm() {
    setDeleteOpen(false);
    deletePinMutation.mutate(pinId);
  }

  if (isLoading) {
    return <PinCardSkeleton />;
  }

  if (!pin) {
    return null;
  }

  return (
    <>
      <Card
        className={cn(
          "overflow-hidden shadow-float motion-safe:animate-[pin-card-enter_250ms_ease-out]",
          pin.chapterId && chapterColor && "border-l-[3px]",
        )}
        style={
          pin.chapterId && chapterColor
            ? { borderLeftColor: chapterColor }
            : undefined
        }
      >
        <div className="relative">
          <PinCardGallery pinId={pinId} alt={pin.title} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 bg-night-900/70 hover:bg-night-900/90"
            aria-label="Закрыть"
            onClick={onClose}
          >
            <IconX size={16} stroke={1.5} />
          </Button>
        </div>

        <PinCardBody pin={pin} isOwner={isOwner} />

        <div className="flex items-center gap-2 border-t border-line-subtle px-4 py-3">
          <VisibilityPill visibility={pin.visibility} />
          <span className="flex-1" />
          {isOwner ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Редактировать"
                onClick={handleEdit}
              >
                <IconPencil size={16} stroke={1.5} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="hover:text-danger"
                aria-label="Удалить"
                onClick={() => {
                  setDeleteOpen(true);
                }}
              >
                <IconTrash size={16} stroke={1.5} />
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled
              title="Скоро"
              aria-label="Реакции — скоро"
            >
              <IconHeart size={16} stroke={1.5} />
            </Button>
          )}
        </div>
      </Card>

      <Dialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Удалить воспоминание?"
        description="Это действие необратимо, фотографии тоже будут удалены."
      >
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setDeleteOpen(false);
          }}
        >
          Отмена
        </Button>
        <Button
          type="button"
          loading={deletePinMutation.isPending}
          onClick={handleDeleteConfirm}
        >
          Удалить
        </Button>
      </Dialog>
    </>
  );
}
