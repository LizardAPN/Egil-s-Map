import DateTimePicker, {
  type DateTimePickerEvent
} from "@react-native-community/datetimepicker";
import Mapbox from "@rnmapbox/maps";
import {
  buildOptimisticMemoryPin,
  createMemoryPin,
  removeOptimisticMemoryPinFromQueries,
  replaceOptimisticMemoryPinInQueries,
  updateMemoryPinQueriesOptimistically,
  useUserChapters,
  type CreateMemoryPinInput,
  type LocalMediaAsset,
  type UploadProgress
} from "@imprint/api/pins";
import type { MemoryPin } from "@imprint/types";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMemoryMapStore } from "../src/store/memory-map-store";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
const SHEET_TRANSLATE_Y = 640;
const TITLE_MAX_LENGTH = 80;
const BODY_MAX_LENGTH = 500;
const NEW_CHAPTER_VALUE = "__new__";

if (MAPBOX_TOKEN.length > 0) {
  Mapbox.setAccessToken(MAPBOX_TOKEN);
}

type VisibilityOption = {
  value: MemoryPin["visibility"];
  icon: string;
  label: string;
  description: string;
};

const VISIBILITY_OPTIONS: VisibilityOption[] = [
  {
    value: "private",
    icon: "🔒",
    label: "Private",
    description: "Only you can see this memory."
  },
  {
    value: "friends",
    icon: "👥",
    label: "Friends",
    description: "Visible to approved friends."
  },
  {
    value: "public",
    icon: "🌍",
    label: "Public",
    description: "Discoverable on the map."
  }
];

function parseCoordinate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPinnedDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function MediaCard({
  asset,
  onRemove
}: {
  asset: LocalMediaAsset;
  onRemove: () => void;
}) {
  return (
    <View className="relative mr-3 overflow-hidden rounded-3xl border border-white/10">
      <Image
        contentFit="cover"
        source={{ uri: asset.uri }}
        style={{
          width: 104,
          height: 104
        }}
      />
      {asset.type === "video" ? (
        <View className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1">
          <Text className="text-[11px] font-medium text-white">Video</Text>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1"
        onPress={onRemove}
      >
        <Text className="text-xs font-semibold text-white">Remove</Text>
      </Pressable>
    </View>
  );
}

function SmallMapPreview({
  latitude,
  longitude
}: {
  latitude: number;
  longitude: number;
}) {
  if (!MAPBOX_TOKEN) {
    return (
      <View className="h-36 items-center justify-center rounded-[28px] bg-white/5">
        <Text className="text-sm text-stone-300">Map preview unavailable without Mapbox token.</Text>
      </View>
    );
  }

  return (
    <View className="overflow-hidden rounded-[28px] border border-white/10">
      <Mapbox.MapView
        attributionEnabled={false}
        compassEnabled={false}
        logoEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        scaleBarEnabled={false}
        scrollEnabled={false}
        style={{ height: 144 }}
        styleURL="mapbox://styles/mapbox/dark-v11"
        zoomEnabled={false}
      >
        <Mapbox.Camera
          defaultSettings={{
            centerCoordinate: [longitude, latitude],
            zoomLevel: 13
          }}
        />
        <Mapbox.PointAnnotation coordinate={[longitude, latitude]} id="new-memory-location">
          <View className="h-5 w-5 rounded-full border-2 border-white bg-sky-400" />
        </Mapbox.PointAnnotation>
      </Mapbox.MapView>
    </View>
  );
}

export default function CreatePinScreen() {
  const params = useLocalSearchParams<{ latitude?: string; longitude?: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const sheetTranslateY = useRef(new Animated.Value(SHEET_TRANSLATE_Y)).current;
  const {
    addOptimisticPin,
    queueFocusTarget,
    removeOptimisticPin
  } = useMemoryMapStore();

  const latitude = parseCoordinate(params.latitude);
  const longitude = parseCoordinate(params.longitude);
  const coordinates = useMemo(
    () =>
      latitude !== null && longitude !== null
        ? { latitude, longitude }
        : null,
    [latitude, longitude]
  );

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<MemoryPin["visibility"]>("private");
  const [pinnedDate, setPinnedDate] = useState(() => new Date());
  const [mediaAssets, setMediaAssets] = useState<LocalMediaAsset[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [isChapterDropdownOpen, setIsChapterDropdownOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const chaptersQuery = useUserChapters(coordinates !== null);
  const selectedChapter = useMemo(() => {
    if (selectedChapterId === NEW_CHAPTER_VALUE) {
      const trimmedTitle = newChapterTitle.trim();
      return trimmedTitle
        ? {
            id: NEW_CHAPTER_VALUE,
            title: trimmedTitle,
            color: "#38bdf8"
          }
        : null;
    }

    return (
      chaptersQuery.data?.find((chapter) => chapter.id === selectedChapterId) ?? null
    );
  }, [chaptersQuery.data, newChapterTitle, selectedChapterId]);

  useEffect(() => {
    Animated.spring(sheetTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 170,
      mass: 0.9
    }).start();
  }, [sheetTranslateY]);

  const handleDismiss = () => {
    router.back();
  };

  const handlePickMedia = async () => {
    setInlineError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setInlineError("Photo library access is required to attach media.");
      return;
    }

    const existingVideo = mediaAssets.some((asset) => asset.type === "video");
    const canSelectMultiple = !existingVideo;
    const remainingSlots = canSelectMultiple ? 5 - mediaAssets.length : 1;

    if (remainingSlots <= 0) {
      setInlineError("You’ve already reached the media limit for this memory.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: canSelectMultiple,
      orderedSelection: canSelectMultiple,
      quality: 0.9,
      selectionLimit: remainingSlots
    });

    if (result.canceled) {
      return;
    }

    const pickedAssets = result.assets.map(
      (asset) =>
        ({
          uri: asset.uri,
          type: asset.type === "video" ? "video" : "image",
          fileName: asset.fileName ?? undefined,
          mimeType: asset.mimeType ?? undefined
        }) satisfies LocalMediaAsset
    );

    const hasVideo = pickedAssets.some((asset) => asset.type === "video");
    if (hasVideo && pickedAssets.length > 1) {
      setInlineError("Choose either one video or up to five photos.");
      return;
    }

    if (hasVideo && mediaAssets.length > 0) {
      setInlineError("Remove photos first if you want to attach a video.");
      return;
    }

    if (!hasVideo && mediaAssets.some((asset) => asset.type === "video")) {
      setInlineError("Remove the video first if you want to attach photos.");
      return;
    }

    const nextAssets = hasVideo ? pickedAssets.slice(0, 1) : [...mediaAssets, ...pickedAssets].slice(0, 5);
    setMediaAssets(nextAssets);
  };

  const handleDateChange = (_event: DateTimePickerEvent, value?: Date) => {
    if (Platform.OS !== "ios") {
      setShowDatePicker(false);
    }

    if (value) {
      setPinnedDate(value);
    }
  };

  const handleSave = async () => {
    if (!coordinates) {
      setInlineError("Missing coordinates for this memory. Return to the map and try again.");
      return;
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 1) {
      setTitleError("Give this moment a name.");
      return;
    }

    if (selectedChapterId === NEW_CHAPTER_VALUE && newChapterTitle.trim().length < 1) {
      setInlineError("Name the new chapter or switch back to an existing one.");
      return;
    }

    setTitleError(null);
    setInlineError(null);
    setIsSubmitting(true);
    setUploadProgress(mediaAssets.length > 0 ? { completed: 0, total: mediaAssets.length, percent: 0 } : null);

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const temporaryId = `temp-${Date.now()}`;
    const input: CreateMemoryPinInput = {
      title: trimmedTitle,
      body,
      pinnedAt: pinnedDate.toISOString(),
      visibility,
      location: coordinates,
      mediaAssets,
      chapterId: selectedChapterId && selectedChapterId !== NEW_CHAPTER_VALUE ? selectedChapterId : undefined,
      newChapterTitle: selectedChapterId === NEW_CHAPTER_VALUE ? newChapterTitle : undefined
    };

    const optimisticPin = buildOptimisticMemoryPin(
      input,
      temporaryId,
      selectedChapter
    );

    addOptimisticPin(optimisticPin);
    updateMemoryPinQueriesOptimistically(queryClient, optimisticPin);

    try {
      const result = await createMemoryPin(input, {
        onUploadProgress: (progress) => {
          setUploadProgress(progress);
        }
      });

      removeOptimisticPin(temporaryId);
      replaceOptimisticMemoryPinInQueries(queryClient, temporaryId, result.pin);
      queueFocusTarget({
        pinId: result.pin.id,
        coordinates: result.pin.location
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissTo("/(tabs)/map");
    } catch (error) {
      removeOptimisticPin(temporaryId);
      removeOptimisticMemoryPinFromQueries(queryClient, temporaryId);
      setInlineError(
        error instanceof Error
          ? error.message
          : "Couldn’t save your memory. Try again?"
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  if (!coordinates) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-950 px-6">
        <Text className="text-center text-lg font-semibold text-white">Missing pin location</Text>
        <Text className="mt-3 text-center text-sm text-stone-300">
          This memory needs a valid latitude and longitude from the map.
        </Text>
        <Pressable
          accessibilityRole="button"
          className="mt-6 rounded-full bg-sky-400 px-5 py-3"
          onPress={handleDismiss}
        >
          <Text className="text-sm font-semibold text-stone-950">Back to map</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black/50">
      <Pressable className="flex-1" onPress={handleDismiss} />
      <Animated.View
        style={{
          transform: [{ translateY: sheetTranslateY }],
          paddingBottom: Math.max(insets.bottom, 20)
        }}
      >
        <View className="max-h-[92%] rounded-t-[32px] border border-white/10 bg-stone-950 px-5 pt-3">
          <View className="mb-4 items-center">
            <View className="h-1.5 w-14 rounded-full bg-white/20" />
          </View>

          <ScrollView
            bounces={false}
            contentContainerStyle={{ paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="mb-5 flex-row items-center justify-between">
              <View>
                <Text className="text-2xl font-semibold text-white">New memory</Text>
                <Text className="mt-1 text-sm text-stone-400">
                  {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                className="rounded-full border border-white/10 px-3 py-2"
                onPress={handleDismiss}
              >
                <Text className="text-xs font-medium uppercase tracking-[1.6px] text-stone-300">
                  Close
                </Text>
              </Pressable>
            </View>

            <SmallMapPreview
              latitude={coordinates.latitude}
              longitude={coordinates.longitude}
            />

            <View className="mt-5">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-sm font-medium text-stone-200">Moment name</Text>
                <Text className="text-xs text-stone-500">{title.length}/{TITLE_MAX_LENGTH}</Text>
              </View>
              <TextInput
                className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
                maxLength={TITLE_MAX_LENGTH}
                onChangeText={(value) => {
                  setTitle(value);
                  if (value.trim().length > 0) {
                    setTitleError(null);
                  }
                }}
                placeholder="Give this moment a name..."
                placeholderTextColor="#78716c"
                value={title}
              />
              {titleError ? (
                <Text className="mt-2 text-sm text-rose-300">{titleError}</Text>
              ) : null}
            </View>

            <View className="mt-5">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-sm font-medium text-stone-200">Story</Text>
                <Text className="text-xs text-stone-500">{body.length}/{BODY_MAX_LENGTH}</Text>
              </View>
              <TextInput
                className="min-h-32 rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-base leading-6 text-white"
                maxLength={BODY_MAX_LENGTH}
                multiline
                onChangeText={setBody}
                placeholder="What happened here?"
                placeholderTextColor="#78716c"
                style={{ textAlignVertical: "top" }}
                value={body}
              />
            </View>

            <View className="mt-5">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-sm font-medium text-stone-200">Media</Text>
                <Text className="text-xs text-stone-500">
                  {mediaAssets.some((asset) => asset.type === "video")
                    ? "1 video max"
                    : `${mediaAssets.length}/5 photos`}
                </Text>
              </View>
              <View className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Pressable
                    accessibilityRole="button"
                    className="mr-3 h-[104px] w-[104px] items-center justify-center rounded-3xl border border-dashed border-white/20 bg-stone-900"
                    onPress={() => {
                      if (isSubmitting) {
                        return;
                      }
                      void handlePickMedia();
                    }}
                  >
                    <Text className="text-center text-sm font-medium text-stone-200">
                      Add media
                    </Text>
                  </Pressable>
                  {mediaAssets.map((asset, index) => (
                    <MediaCard
                      asset={asset}
                      key={`${asset.uri}-${index}`}
                      onRemove={() => {
                        setMediaAssets((currentAssets) =>
                          currentAssets.filter((_, currentIndex) => currentIndex !== index)
                        );
                      }}
                    />
                  ))}
                </ScrollView>
                <Text className="mt-3 text-xs leading-5 text-stone-400">
                  Add up to 5 photos or 1 video.
                </Text>
              </View>
            </View>

            <View className="mt-5">
              <Text className="mb-2 text-sm font-medium text-stone-200">Chapter</Text>
              <View className="rounded-3xl border border-white/10 bg-white/5 p-3">
                <Pressable
                  accessibilityRole="button"
                  className="rounded-2xl bg-stone-900 px-4 py-4"
                  onPress={() => {
                    setIsChapterDropdownOpen((open) => !open);
                  }}
                >
                  <Text className="text-base text-white">
                    {selectedChapter?.title ?? "Choose a chapter"}
                  </Text>
                </Pressable>
                {isChapterDropdownOpen ? (
                  <View className="mt-3 gap-2">
                    <Pressable
                      accessibilityRole="button"
                      className="rounded-2xl border border-white/10 px-4 py-3"
                      onPress={() => {
                        setSelectedChapterId(null);
                        setIsChapterDropdownOpen(false);
                      }}
                    >
                      <Text className="text-sm text-stone-200">No chapter</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      className="rounded-2xl border border-sky-400/30 bg-sky-400/10 px-4 py-3"
                      onPress={() => {
                        setSelectedChapterId(NEW_CHAPTER_VALUE);
                        setIsChapterDropdownOpen(false);
                      }}
                    >
                      <Text className="text-sm font-medium text-sky-200">New chapter</Text>
                    </Pressable>
                    {chaptersQuery.isLoading ? (
                      <View className="items-center py-4">
                        <ActivityIndicator color="#38bdf8" />
                      </View>
                    ) : (
                      chaptersQuery.data?.map((chapter) => (
                        <Pressable
                          accessibilityRole="button"
                          className="rounded-2xl border border-white/10 px-4 py-3"
                          key={chapter.id}
                          onPress={() => {
                            setSelectedChapterId(chapter.id);
                            setIsChapterDropdownOpen(false);
                          }}
                        >
                          <Text className="text-sm font-medium text-white">{chapter.title}</Text>
                          <Text className="mt-1 text-xs text-stone-400">{chapter.color}</Text>
                        </Pressable>
                      ))
                    )}
                  </View>
                ) : null}
                {selectedChapterId === NEW_CHAPTER_VALUE ? (
                  <TextInput
                    className="mt-3 rounded-2xl border border-white/10 bg-stone-900 px-4 py-4 text-base text-white"
                    maxLength={60}
                    onChangeText={setNewChapterTitle}
                    placeholder="Name your new chapter"
                    placeholderTextColor="#78716c"
                    value={newChapterTitle}
                  />
                ) : null}
              </View>
            </View>

            <View className="mt-5">
              <Text className="mb-2 text-sm font-medium text-stone-200">Pinned date</Text>
              <View className="rounded-3xl border border-white/10 bg-white/5 p-3">
                <Pressable
                  accessibilityRole="button"
                  className="rounded-2xl bg-stone-900 px-4 py-4"
                  onPress={() => {
                    setShowDatePicker(true);
                  }}
                >
                  <Text className="text-base text-white">{formatPinnedDate(pinnedDate)}</Text>
                </Pressable>
                {showDatePicker ? (
                  <View className="mt-3 rounded-2xl bg-stone-900 p-2">
                    <DateTimePicker
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      mode="datetime"
                      onChange={handleDateChange}
                      value={pinnedDate}
                    />
                    {Platform.OS === "ios" ? (
                      <View className="mt-3 flex-row justify-end">
                        <Pressable
                          accessibilityRole="button"
                          className="rounded-full bg-sky-400 px-4 py-2"
                          onPress={() => {
                            setShowDatePicker(false);
                          }}
                        >
                          <Text className="text-sm font-semibold text-stone-950">Done</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>

            <View className="mt-5">
              <Text className="mb-2 text-sm font-medium text-stone-200">Visibility</Text>
              <View className="gap-2 rounded-3xl border border-white/10 bg-white/5 p-3">
                {VISIBILITY_OPTIONS.map((option) => {
                  const selected = option.value === visibility;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      className={`rounded-2xl border px-4 py-4 ${
                        selected
                          ? "border-sky-400/40 bg-sky-400/10"
                          : "border-white/10 bg-stone-900"
                      }`}
                      key={option.value}
                      onPress={() => {
                        setVisibility(option.value);
                      }}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-3">
                          <Text className="text-lg">{option.icon}</Text>
                          <View>
                            <Text className="text-sm font-medium text-white">{option.label}</Text>
                            <Text className="mt-1 text-xs text-stone-400">
                              {option.description}
                            </Text>
                          </View>
                        </View>
                        {selected ? (
                          <View className="h-3 w-3 rounded-full bg-sky-400" />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {uploadProgress ? (
              <View className="mt-5 rounded-3xl border border-sky-400/20 bg-sky-400/10 p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-sky-100">Uploading media</Text>
                  <Text className="text-xs text-sky-200">
                    {uploadProgress.completed}/{uploadProgress.total}
                  </Text>
                </View>
                <View className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <View
                    className="h-full rounded-full bg-sky-400"
                    style={{ width: `${uploadProgress.percent}%` }}
                  />
                </View>
              </View>
            ) : null}

            {inlineError ? (
              <View className="mt-5 rounded-3xl border border-rose-400/30 bg-rose-500/15 px-4 py-3">
                <Text className="text-sm leading-6 text-rose-100">{inlineError}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              className={`mt-6 items-center rounded-full px-5 py-4 ${
                isSubmitting ? "bg-sky-400/50" : "bg-sky-400"
              }`}
              disabled={isSubmitting}
              onPress={() => {
                void handleSave();
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#09090b" />
              ) : (
                <Text className="text-base font-semibold text-stone-950">Save memory</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}
