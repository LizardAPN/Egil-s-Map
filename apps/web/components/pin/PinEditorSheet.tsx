"use client";

import { useQuery } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { IconCrosshair } from "@tabler/icons-react";

import {
  ApiError,
  createBrowserClient,
  forwardGeocode,
  isMapboxTokenError,
  listMyChapters,
  listPinMedia,
  reverseGeocode,
  type GeocodeResult,
} from "@imprint/api";
import type { Pin, PinLocation, Visibility } from "@imprint/types";
import {
  Button,
  DatePicker,
  dateTimeToIso,
  Input,
  nowDateTimeValue,
  Pill,
  Sheet,
  Spinner,
  Textarea,
  cn,
  toast,
  type DateTimeValue,
} from "@imprint/ui";

import { useCreatePin } from "../../hooks/use-create-pin";
import { useMyPreferences } from "../../hooks/use-my-preferences";
import { useUpdatePin } from "../../hooks/use-update-pin";
import { pinKeys } from "../../lib/pin-keys";
import { VISIBILITY_OPTIONS } from "../../lib/pin-visibility";
import { useMapController } from "../map/MapCanvas";
import { useEditorStore } from "../../stores/editor-store";
import {
  PinPhotoSection,
  type PinPhotoSectionHandle,
} from "./PinPhotoSection";

function formatCoords(location: PinLocation): string {
  return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
}

function isoToDateTimeValue(iso: string): DateTimeValue {
  const date = new Date(iso);

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

export function PinEditorSheet({
  requestExit,
  exitEditor,
  confirmDialog,
  existingPin = null,
}: {
  requestExit: () => void;
  exitEditor: () => void;
  confirmDialog: ReactNode;
  existingPin?: Pin | null;
}) {
  const controller = useMapController();
  const isCreateMode = useEditorStore((state) => state.isCreateMode);
  const draftLocation = useEditorStore((state) => state.draftLocation);
  const setDraftLocation = useEditorStore((state) => state.setDraftLocation);
  const setFormDirty = useEditorStore((state) => state.setFormDirty);
  const { data: preferences } = useMyPreferences();
  const createPinMutation = useCreatePin();
  const updatePinMutation = useUpdatePin();
  const isEditMode = existingPin !== null;

  const { data: chapters } = useQuery({
    queryKey: ["chapters", "mine"],
    queryFn: async () => {
      return listMyChapters(createBrowserClient());
    },
  });

  const titleRef = useRef<HTMLInputElement>(null);
  const photoSectionRef = useRef<PinPhotoSectionHandle>(null);
  const initializedEditPinRef = useRef<string | null>(null);
  const searchListId = useId();

  const [searchHighlight, setSearchHighlight] = useState(0);
  const [isMovingLocation, setIsMovingLocation] = useState(false);
  const moveOriginRef = useRef<PinLocation | null>(null);
  const [locationName, setLocationName] = useState("");
  const [reverseLoading, setReverseLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinnedAt, setPinnedAt] = useState<DateTimeValue>(nowDateTimeValue);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [visibilityInitialized, setVisibilityInitialized] = useState(false);

  const { data: pinMedia } = useQuery({
    queryKey: pinKeys.media(existingPin?.id ?? null),
    queryFn: async () => {
      if (!existingPin) {
        return [];
      }

      return listPinMedia(createBrowserClient(), existingPin.id);
    },
    enabled: Boolean(existingPin),
  });

  useEffect(() => {
    if (!existingPin || initializedEditPinRef.current === existingPin.id) {
      return;
    }

    initializedEditPinRef.current = existingPin.id;
    setLocationName(existingPin.locationName ?? "");
    setTitle(existingPin.title);
    setBody(existingPin.body ?? "");
    setPinnedAt(isoToDateTimeValue(existingPin.pinnedAt));
    setChapterId(existingPin.chapterId);
    setVisibility(existingPin.visibility);
    setVisibilityInitialized(true);
  }, [existingPin]);

  useEffect(() => {
    if (draftLocation || existingPin || isCreateMode) {
      return;
    }

    setLocationName("");
    setSearchQuery("");
    setSearchResults([]);
    setGeocodeError(null);
    setSearchError(null);
    setHasSearched(false);
    setTitle("");
    setBody("");
    setPinnedAt(nowDateTimeValue());
    setChapterId(null);
    setVisibilityInitialized(false);
    setFormDirty(false);
  }, [draftLocation, existingPin, isCreateMode, setFormDirty]);

  const markDirty = useCallback(() => {
    setFormDirty(true);
  }, [setFormDirty]);

  useEffect(() => {
    if (!preferences || visibilityInitialized) {
      return;
    }

    setVisibility(preferences.defaultPinVisibility);
    setVisibilityInitialized(true);
  }, [preferences, visibilityInitialized]);

  useEffect(() => {
    if (!draftLocation || existingPin?.locationName) {
      return;
    }

    let cancelled = false;
    setReverseLoading(true);

    const timer = setTimeout(() => {
      void reverseGeocode(draftLocation.lng, draftLocation.lat)
        .then((result) => {
          if (cancelled) {
            return;
          }

          if (result) {
            setGeocodeError(null);
            setLocationName(result.name);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setGeocodeError("Не удалось найти место");
          }
        })
        .finally(() => {
          if (!cancelled) {
            setReverseLoading(false);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draftLocation, existingPin?.locationName]);

  useEffect(() => {
    if (!draftLocation) {
      return;
    }

    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        titleRef.current?.focus();
      });
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [draftLocation]);

  useEffect(() => {
    const trimmed = searchQuery.trim();

    if (!trimmed) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      setHasSearched(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    setSearchError(null);
    setHasSearched(false);

    const timer = setTimeout(() => {
      const camera = controller?.getCamera();
      const proximity =
        draftLocation ??
        (camera
          ? { lng: camera.center[0], lat: camera.center[1] }
          : undefined);

      void forwardGeocode(trimmed, proximity ? { proximity } : undefined)
        .then((results) => {
          if (cancelled) {
            return;
          }

          setSearchError(null);
          setSearchResults(results);
          setSearchHighlight(0);
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            if (error instanceof ApiError && isMapboxTokenError(error)) {
              setSearchError("Токен Mapbox не принят");
            } else {
              setSearchError("Не удалось найти место");
            }
            setSearchResults([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setSearchLoading(false);
            setHasSearched(true);
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, controller, draftLocation]);

  const bodyLength = body.length;
  const showBodyCounter = bodyLength >= 3600;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = textareaRef.current;

    if (!element) {
      return;
    }

    element.style.height = "auto";
    const maxHeight = 6 * 24;
    element.style.height = `${String(Math.min(element.scrollHeight, maxHeight))}px`;
  }, [body]);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      return;
    }

    requestExit();
  }

  function selectSearchResult(result: GeocodeResult) {
    controller?.moveDraft(result.location);
    controller?.flyToPin(result.location);
    setLocationName(result.name);
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
    markDirty();
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!searchOpen || searchResults.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSearchHighlight((current) =>
        Math.min(current + 1, searchResults.length - 1),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSearchHighlight((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const result = searchResults[searchHighlight];

      if (result) {
        selectSearchResult(result);
      }
    } else if (event.key === "Escape") {
      setSearchOpen(false);
    }
  }

  function handleSubmit() {
    if (!draftLocation || !title.trim() || createPinMutation.isPending || updatePinMutation.isPending) {
      return;
    }

    if (isEditMode) {
      updatePinMutation.mutate(
        {
          id: existingPin.id,
          patch: {
            chapterId,
            location: draftLocation,
            locationName: locationName.trim() || null,
            title: title.trim(),
            body: body.trim() || null,
            visibility,
            pinnedAt: dateTimeToIso(pinnedAt),
          },
        },
        {
          onSuccess: () => {
            controller?.exitMoveMode();
            toast("Воспоминание сохранено");
            exitEditor();
          },
        },
      );

      return;
    }

    const stagedFiles = photoSectionRef.current?.getStagedFiles() ?? [];

    createPinMutation.mutate({
      chapterId,
      location: draftLocation,
      locationName: locationName.trim() || null,
      title: title.trim(),
      body: body.trim() || null,
      visibility,
      pinnedAt: dateTimeToIso(pinnedAt),
      stagedFiles,
    });
  }

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (!draftLocation) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        handleSubmit();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- submit reads latest form state
  }, [draftLocation, title, body, chapterId, visibility, pinnedAt, locationName, draftLocation]);

  const visibilityHelper =
    VISIBILITY_OPTIONS.find((option) => option.value === visibility)?.helper ??
    "";

  function startMoveLocation() {
    if (!draftLocation) {
      return;
    }

    moveOriginRef.current = draftLocation;
    setIsMovingLocation(true);
    controller?.enterMoveMode(draftLocation);
    toast("Перетащи точку или кликни новое место");
  }

  function confirmMoveLocation() {
    const location = controller?.getDraftLocation();

    if (location) {
      setDraftLocation(location);
      markDirty();
    }

    controller?.exitMoveMode();
    setIsMovingLocation(false);
    moveOriginRef.current = null;
  }

  function cancelMoveLocation() {
    controller?.exitMoveMode();

    if (moveOriginRef.current) {
      setDraftLocation(moveOriginRef.current);
    }

    setIsMovingLocation(false);
    moveOriginRef.current = null;
  }

  useEffect(() => {
    if (!isMovingLocation) {
      return;
    }

    function handleMoveKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelMoveLocation();
        return;
      }

      if (
        event.key === "Enter" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        const target = event.target;

        if (
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement
        ) {
          return;
        }

        event.preventDefault();
        confirmMoveLocation();
      }
    }

    window.addEventListener("keydown", handleMoveKeyDown);

    return () => {
      window.removeEventListener("keydown", handleMoveKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers read latest move state
  }, [isMovingLocation]);

  const sheetOpen = isCreateMode || draftLocation !== null;
  const saveDisabled = !draftLocation || !title.trim();
  const saveDisabledReason = !draftLocation
    ? "Сначала выбери точку на карте"
    : !title.trim()
      ? "Введите заголовок"
      : undefined;
  const trimmedSearchQuery = searchQuery.trim();
  const showSearchDropdown =
    searchOpen &&
    (searchLoading ||
      searchResults.length > 0 ||
      searchError !== null ||
      (hasSearched && trimmedSearchQuery.length > 0 && !searchLoading));

  return (
    <>
      <Sheet
        open={sheetOpen}
        onOpenChange={handleOpenChange}
        title={isEditMode ? "Редактировать воспоминание" : "Новое воспоминание"}
        blocking={false}
        dismissOnInteractOutside={false}
      >
        <div className="flex h-full flex-col gap-6">
          <section className="space-y-3">
            {isEditMode ? (
              <>
                <div className="space-y-2">
                  <label htmlFor="pin-location-name" className="text-sm text-ink-secondary">
                    Место
                  </label>
                  <Input
                    id="pin-location-name"
                    value={locationName}
                    disabled={isMovingLocation}
                    onChange={(event) => {
                      setLocationName(event.target.value);
                      markDirty();
                    }}
                    placeholder="Название места"
                  />
                  {draftLocation ? (
                    <p className="font-mono text-xs text-ink-muted">
                      {formatCoords(draftLocation)}
                    </p>
                  ) : null}
                </div>
                {isMovingLocation ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={confirmMoveLocation}
                    >
                      Готово
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={cancelMoveLocation}
                    >
                      Отмена
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={startMoveLocation}
                  >
                    Переместить точку
                  </Button>
                )}
              </>
            ) : (
              <>
                {!draftLocation ? (
                  <div className="flex items-center gap-3 rounded-control border border-dashed border-line-strong px-3 py-4">
                    <IconCrosshair
                      className="shrink-0 text-ink-muted"
                      size={20}
                      stroke={1.5}
                      aria-hidden
                    />
                    <p className="text-sm text-ink-secondary">
                      Кликни по карте, чтобы поставить точку — или найди место через
                      поиск ниже
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label htmlFor="pin-location-name" className="text-sm text-ink-secondary">
                      Место
                    </label>
                    <div className="relative">
                      <Input
                        id="pin-location-name"
                        value={locationName}
                        onChange={(event) => {
                          setLocationName(event.target.value);
                          markDirty();
                        }}
                        placeholder="Название места"
                      />
                      {reverseLoading ? (
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                          <Spinner size={14} />
                        </div>
                      ) : null}
                    </div>
                    <p className="font-mono text-xs text-ink-muted">
                      {formatCoords(draftLocation)}
                    </p>
                    {geocodeError ? (
                      <p className="text-xs text-danger">{geocodeError}</p>
                    ) : null}
                  </div>
                )}

                <div className="relative space-y-2">
                  <label htmlFor="pin-location-search" className="text-sm text-ink-secondary">
                    Найти место
                  </label>
                  <Input
                    id="pin-location-search"
                    value={searchQuery}
                    role="combobox"
                    aria-expanded={showSearchDropdown}
                    aria-controls={searchListId}
                    aria-autocomplete="list"
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => {
                      setSearchOpen(true);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Город, район или место"
                  />
                  {showSearchDropdown ? (
                    <ul
                      id={searchListId}
                      role="listbox"
                      className="absolute z-10 mt-1 w-full overflow-hidden rounded-control border border-line bg-night-800 shadow-float"
                    >
                      {searchLoading ? (
                        <li className="flex items-center gap-2 px-3 py-2 text-sm text-ink-muted">
                          <Spinner size={14} />
                          Поиск…
                        </li>
                      ) : searchError ? (
                        <li className="px-3 py-2 text-sm text-danger">{searchError}</li>
                      ) : hasSearched && searchResults.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-ink-muted">
                          Ничего не найдено
                        </li>
                      ) : (
                        searchResults.map((result, index) => (
                          <li key={result.id} role="option" aria-selected={index === searchHighlight}>
                            <button
                              type="button"
                              className={cn(
                                "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-night-700",
                                index === searchHighlight && "bg-night-700",
                              )}
                              onMouseDown={(event) => {
                                event.preventDefault();
                                selectSearchResult(result);
                              }}
                            >
                              <span className="text-ink-primary">{result.name}</span>
                              {result.placeFormatted ? (
                                <span className="mt-0.5 block text-xs text-ink-muted">
                                  {result.placeFormatted}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  ) : null}
                </div>
              </>
            )}
          </section>

          <section className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="pin-pinned-at" className="text-sm text-ink-secondary">
                Дата события
              </label>
              <DatePicker
                id="pin-pinned-at"
                value={pinnedAt}
                showTime
                onChange={(value) => {
                  setPinnedAt(value);
                  markDirty();
                }}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="pin-title" className="text-sm text-ink-secondary">
                Заголовок
              </label>
              <Input
                ref={titleRef}
                id="pin-title"
                value={title}
                maxLength={120}
                onChange={(event) => {
                  setTitle(event.target.value);
                  markDirty();
                }}
                placeholder="О чём это воспоминание?"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="pin-body" className="text-sm text-ink-secondary">
                История
              </label>
              <Textarea
                ref={textareaRef}
                id="pin-body"
                value={body}
                maxLength={4000}
                rows={3}
                className="resize-none overflow-y-auto"
                onChange={(event) => {
                  setBody(event.target.value);
                  markDirty();
                }}
                placeholder="Расскажи, что здесь произошло"
              />
              {showBodyCounter ? (
                <p className="text-right text-xs text-ink-muted">
                  {bodyLength} / 4000
                </p>
              ) : null}
            </div>

            <PinPhotoSection
              ref={photoSectionRef}
              pinId={existingPin?.id ?? null}
              initialMedia={pinMedia}
              onDirty={markDirty}
            />

            <div className="space-y-2">
              <span className="text-sm text-ink-secondary">Глава</span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <Pill
                  as="button"
                  label="Без главы"
                  selected={chapterId === null}
                  onClick={() => {
                    setChapterId(null);
                    markDirty();
                  }}
                />
                {chapters?.map((chapter) => (
                  <Pill
                    key={chapter.id}
                    as="button"
                    label={chapter.title}
                    color={chapter.color}
                    selected={chapterId === chapter.id}
                    onClick={() => {
                      setChapterId(chapter.id);
                      markDirty();
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm text-ink-secondary">Видимость</span>
              <div className="grid grid-cols-2 gap-2">
                {VISIBILITY_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = visibility === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        setVisibility(option.value);
                        markDirty();
                      }}
                      className={cn(
                        "flex items-center gap-2 rounded-control border px-3 py-2 text-sm transition-colors",
                        isSelected
                          ? "border-amber bg-night-700 text-ink-primary"
                          : "border-line bg-night-800 text-ink-secondary hover:border-line-strong",
                      )}
                    >
                      <Icon size={16} stroke={1.5} aria-hidden />
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-ink-muted">{visibilityHelper}</p>
            </div>
          </section>

          <div className="mt-auto flex gap-2 border-t border-line-subtle pt-4">
            <span
              className={cn("flex flex-1", saveDisabled && "cursor-not-allowed")}
              title={saveDisabled ? saveDisabledReason : undefined}
            >
              <Button
                type="button"
                className="w-full"
                loading={createPinMutation.isPending || updatePinMutation.isPending}
                disabled={saveDisabled}
                onClick={handleSubmit}
              >
                Сохранить
              </Button>
            </span>
            <Button
              type="button"
              variant="ghost"
              disabled={createPinMutation.isPending || updatePinMutation.isPending}
              onClick={requestExit}
            >
              Отмена
            </Button>
          </div>
        </div>
      </Sheet>
      {confirmDialog}
    </>
  );
}
