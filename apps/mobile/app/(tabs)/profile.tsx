import DateTimePicker, {
  type DateTimePickerEvent
} from "@react-native-community/datetimepicker";
import {
  createChapterWithCover,
  useChapterCoverCandidates,
  useCurrentUserChapters,
  useCurrentUserProfile,
  useUserChapters,
  useUserProfile,
  type CoverCandidate
} from "@imprint/api/chapters";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

const CHAPTER_COLORS = [
  "#38bdf8",
  "#22c55e",
  "#f97316",
  "#eab308",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#f472b6"
] as const;

function formatDateRange(startedAt?: string, endedAt?: string) {
  if (!startedAt && !endedAt) {
    return "Open timeline";
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric"
  });

  const from = startedAt ? formatter.format(new Date(startedAt)) : "Unknown";
  const to = endedAt ? formatter.format(new Date(endedAt)) : "Now";
  return `${from} - ${to}`;
}

function formatDay(date: Date | null) {
  if (!date) {
    return "Optional";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function ChapterCreateSheet({
  visible,
  onClose
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const translateY = useRef(new Animated.Value(720)).current;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(CHAPTER_COLORS[0]);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [endedAt, setEndedAt] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState<"from" | "to" | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CoverCandidate | null>(null);
  const [uploadedCover, setUploadedCover] = useState<{
    uri: string;
    fileName?: string;
    mimeType?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const coverCandidatesQuery = useChapterCoverCandidates(visible);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : 720,
      useNativeDriver: true,
      damping: 18,
      stiffness: 170,
      mass: 0.9
    }).start();
  }, [translateY, visible]);

  const createMutation = useMutation({
    mutationFn: createChapterWithCover,
    onSuccess: async (chapter) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["chapters", "me"] }),
        queryClient.invalidateQueries({ queryKey: ["profile", "me"] })
      ]);

      setTitle("");
      setDescription("");
      setSelectedColor(CHAPTER_COLORS[0]);
      setStartedAt(null);
      setEndedAt(null);
      setSelectedCandidate(null);
      setUploadedCover(null);
      setErrorMessage(null);
      onClose();
      router.push(`/chapter/${chapter.id}`);
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error ? error.message : "Couldn’t create chapter. Try again?"
      );
    }
  });

  const pickUploadedCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage("Photo library access is required to upload a cover.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.9
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (!asset) {
      return;
    }

    setUploadedCover({
      uri: asset.uri,
      fileName: asset.fileName ?? undefined,
      mimeType: asset.mimeType ?? undefined
    });
    setSelectedCandidate(null);
    setErrorMessage(null);
  };

  const handleDateChange = (_event: DateTimePickerEvent, value?: Date) => {
    if (Platform.OS !== "ios") {
      const field = showPicker;
      setShowPicker(null);
      if (!field || !value) {
        return;
      }
      if (field === "from") {
        setStartedAt(value);
      } else {
        setEndedAt(value);
      }
      return;
    }

    if (!value || !showPicker) {
      return;
    }

    if (showPicker === "from") {
      setStartedAt(value);
    } else {
      setEndedAt(value);
    }
  };

  const handleSubmit = () => {
    if (title.trim().length < 1) {
      setErrorMessage("Chapter title is required.");
      return;
    }

    setErrorMessage(null);
    createMutation.mutate({
      title,
      description,
      color: selectedColor,
      startedAt: startedAt?.toISOString(),
      endedAt: endedAt?.toISOString(),
      coverUrl: selectedCandidate?.imageUrl,
      coverUpload: uploadedCover
    });
  };

  if (!visible) {
    return null;
  }

  return (
    <View className="absolute inset-0 bg-black/60">
      <Pressable className="flex-1" onPress={onClose} />
      <Animated.View
        style={{
          transform: [{ translateY }],
          paddingBottom: Math.max(insets.bottom, 20)
        }}
      >
        <View className="max-h-[92%] rounded-t-[32px] border border-white/10 bg-stone-950 px-5 pt-3">
          <View className="mb-4 items-center">
            <View className="h-1.5 w-14 rounded-full bg-white/20" />
          </View>
          <ScrollView
            bounces={false}
            contentContainerStyle={{ paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="mb-5 flex-row items-center justify-between">
              <View>
                <Text className="text-2xl font-semibold text-white">New chapter</Text>
                <Text className="mt-1 text-sm text-stone-400">
                  Build a timeline people can step into.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                className="rounded-full border border-white/10 px-3 py-2"
                onPress={onClose}
              >
                <Text className="text-xs font-medium uppercase tracking-[1.6px] text-stone-300">
                  Close
                </Text>
              </Pressable>
            </View>

            <View className="gap-5">
              <View>
                <Text className="mb-2 text-sm font-medium text-stone-200">Title</Text>
                <TextInput
                  className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
                  maxLength={80}
                  onChangeText={setTitle}
                  placeholder="Year in Lisbon"
                  placeholderTextColor="#78716c"
                  value={title}
                />
              </View>

              <View>
                <Text className="mb-2 text-sm font-medium text-stone-200">Description</Text>
                <TextInput
                  className="min-h-28 rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-base leading-6 text-white"
                  multiline
                  onChangeText={setDescription}
                  placeholder="What defines this chapter?"
                  placeholderTextColor="#78716c"
                  style={{ textAlignVertical: "top" }}
                  value={description}
                />
              </View>

              <View>
                <Text className="mb-2 text-sm font-medium text-stone-200">Color</Text>
                <View className="flex-row flex-wrap gap-3">
                  {CHAPTER_COLORS.map((color) => {
                    const selected = selectedColor === color;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        className={`h-12 w-12 rounded-full border-2 ${
                          selected ? "border-white" : "border-transparent"
                        }`}
                        key={color}
                        onPress={() => {
                          setSelectedColor(color);
                        }}
                        style={{ backgroundColor: color }}
                      />
                    );
                  })}
                </View>
              </View>

              <View>
                <Text className="mb-2 text-sm font-medium text-stone-200">Date range</Text>
                <View className="flex-row gap-3">
                  <Pressable
                    accessibilityRole="button"
                    className="flex-1 rounded-3xl border border-white/10 bg-white/5 px-4 py-4"
                    onPress={() => {
                      setShowPicker("from");
                    }}
                  >
                    <Text className="text-xs uppercase tracking-[1.6px] text-stone-500">From</Text>
                    <Text className="mt-2 text-base text-white">{formatDay(startedAt)}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    className="flex-1 rounded-3xl border border-white/10 bg-white/5 px-4 py-4"
                    onPress={() => {
                      setShowPicker("to");
                    }}
                  >
                    <Text className="text-xs uppercase tracking-[1.6px] text-stone-500">To</Text>
                    <Text className="mt-2 text-base text-white">{formatDay(endedAt)}</Text>
                  </Pressable>
                </View>
                {showPicker ? (
                  <View className="mt-3 rounded-3xl bg-stone-900 p-3">
                    <DateTimePicker
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      mode="date"
                      onChange={handleDateChange}
                      value={
                        showPicker === "from"
                          ? startedAt ?? new Date()
                          : endedAt ?? new Date()
                      }
                    />
                    {Platform.OS === "ios" ? (
                      <View className="mt-3 flex-row justify-end">
                        <Pressable
                          accessibilityRole="button"
                          className="rounded-full bg-sky-400 px-4 py-2"
                          onPress={() => {
                            setShowPicker(null);
                          }}
                        >
                          <Text className="text-sm font-semibold text-stone-950">Done</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>

              <View>
                <Text className="mb-2 text-sm font-medium text-stone-200">Cover photo</Text>
                <View className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <Pressable
                    accessibilityRole="button"
                    className="mb-4 rounded-2xl border border-sky-400/30 bg-sky-400/10 px-4 py-3"
                    onPress={() => {
                      void pickUploadedCover();
                    }}
                  >
                    <Text className="text-center text-sm font-medium text-sky-200">
                      Upload cover photo
                    </Text>
                  </Pressable>

                  {uploadedCover ? (
                    <View className="mb-4 overflow-hidden rounded-3xl border border-white/10">
                      <Image
                        contentFit="cover"
                        source={{ uri: uploadedCover.uri }}
                        style={{ width: "100%", height: 160 }}
                      />
                    </View>
                  ) : null}

                  <Text className="mb-3 text-xs uppercase tracking-[1.6px] text-stone-500">
                    Or pick from existing memories
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {coverCandidatesQuery.isLoading ? (
                      <View className="mr-3 h-28 w-28 items-center justify-center rounded-3xl bg-stone-900">
                        <ActivityIndicator color="#38bdf8" />
                      </View>
                    ) : (
                      coverCandidatesQuery.data?.map((candidate) => {
                        const selected = selectedCandidate?.id === candidate.id;
                        return (
                          <Pressable
                            accessibilityRole="button"
                            className={`mr-3 overflow-hidden rounded-3xl border ${
                              selected ? "border-sky-400" : "border-white/10"
                            }`}
                            key={candidate.id}
                            onPress={() => {
                              setSelectedCandidate(candidate);
                              setUploadedCover(null);
                            }}
                          >
                            <Image
                              contentFit="cover"
                              source={{ uri: candidate.imageUrl }}
                              style={{ width: 112, height: 112 }}
                            />
                          </Pressable>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
              </View>

              {errorMessage ? (
                <View className="rounded-3xl border border-rose-400/30 bg-rose-500/15 px-4 py-3">
                  <Text className="text-sm leading-6 text-rose-100">{errorMessage}</Text>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                className={`items-center rounded-full px-5 py-4 ${
                  createMutation.isPending ? "bg-sky-400/50" : "bg-sky-400"
                }`}
                disabled={createMutation.isPending}
                onPress={handleSubmit}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#09090b" />
                ) : (
                  <Text className="text-base font-semibold text-stone-950">Create chapter</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ userId?: string }>();
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const viewedUserId = useMemo(
    () => (typeof params.userId === "string" ? params.userId : ""),
    [params.userId]
  );
  const isOwnProfile = viewedUserId.length === 0;
  const ownProfileQuery = useCurrentUserProfile(isOwnProfile);
  const ownChaptersQuery = useCurrentUserChapters(isOwnProfile);
  const otherProfileQuery = useUserProfile(viewedUserId, !isOwnProfile);
  const otherChaptersQuery = useUserChapters(viewedUserId, !isOwnProfile);
  const profileQuery = isOwnProfile ? ownProfileQuery : otherProfileQuery;
  const chaptersQuery = isOwnProfile ? ownChaptersQuery : otherChaptersQuery;

  return (
    <View className="flex-1 bg-stone-950">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 96
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5">
          {profileQuery.isLoading ? (
            <View className="rounded-[32px] border border-white/10 bg-white/5 p-5">
              <ActivityIndicator color="#38bdf8" />
            </View>
          ) : profileQuery.data ? (
            <View className="rounded-[32px] border border-white/10 bg-white/5 p-5">
              <View className="flex-row items-center gap-4">
                {profileQuery.data.avatarUrl ? (
                  <Image
                    contentFit="cover"
                    source={{ uri: profileQuery.data.avatarUrl }}
                    style={{ width: 72, height: 72, borderRadius: 999 }}
                  />
                ) : (
                  <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-sky-400">
                    <Text className="text-2xl font-semibold text-stone-950">
                      {profileQuery.data.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-2xl font-semibold text-white">
                    {profileQuery.data.displayName}
                  </Text>
              <Text className="mt-1 text-sm text-stone-400">
                    @{profileQuery.data.username}
                  </Text>
                </View>
              </View>
              <Text className="mt-4 text-sm leading-6 text-stone-300">
                {profileQuery.data.bio ?? "Collecting places that changed the story."}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mt-8">
          <View className="mb-4 flex-row items-center justify-between px-5">
            <View>
              <Text className="text-xl font-semibold text-white">
                {isOwnProfile ? "My chapters" : `${profileQuery.data?.displayName ?? "Their"} chapters`}
              </Text>
              <Text className="mt-1 text-sm text-stone-400">
                Narrative arcs instead of loose posts.
              </Text>
            </View>
            {isOwnProfile ? (
              <Pressable
                accessibilityRole="button"
                className="rounded-full bg-sky-400 px-4 py-3"
                onPress={() => {
                  setShowCreateSheet(true);
                }}
              >
                <Text className="text-sm font-semibold text-stone-950">New chapter</Text>
              </Pressable>
            ) : null}
          </View>

          {chaptersQuery.isLoading ? (
            <View className="px-5">
              <View className="h-56 items-center justify-center rounded-[32px] border border-white/10 bg-white/5">
                <ActivityIndicator color="#38bdf8" />
              </View>
            </View>
          ) : chaptersQuery.data && chaptersQuery.data.length > 0 ? (
            <ScrollView
              className="pl-5"
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {chaptersQuery.data.map((chapter) => (
                <Pressable
                  accessibilityRole="button"
                  className="mr-4 w-72 overflow-hidden rounded-[32px]"
                  key={chapter.id}
                  onPress={() => {
                    router.push(`/chapter/${chapter.id}`);
                  }}
                  style={{ backgroundColor: chapter.color }}
                >
                  {chapter.coverUrl ? (
                    <Image
                      contentFit="cover"
                      source={{ uri: chapter.coverUrl }}
                      style={{ width: "100%", height: 168 }}
                    />
                  ) : (
                    <View className="h-42 bg-black/20" style={{ height: 168 }} />
                  )}
                  <View className="bg-black/30 px-5 py-4">
                    <Text className="text-2xl font-semibold text-white">{chapter.title}</Text>
                    <Text className="mt-2 text-sm text-white/80">
                      {chapter.pinCount} {chapter.pinCount === 1 ? "memory" : "memories"}
                    </Text>
                    <Text className="mt-1 text-sm text-white/80">
                      {formatDateRange(chapter.startedAt, chapter.endedAt)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View className="px-5">
              <View className="rounded-[32px] border border-white/10 bg-white/5 px-5 py-8">
                <Text className="text-lg font-semibold text-white">
                  {isOwnProfile ? "No chapters yet" : "No public chapters yet"}
                </Text>
                <Text className="mt-2 text-sm leading-6 text-stone-300">
                  {isOwnProfile
                    ? "Start with a chapter to group memories into something people can explore."
                    : "This explorer has not shared a public chapter yet."}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {isOwnProfile ? (
        <ChapterCreateSheet
          onClose={() => {
            setShowCreateSheet(false);
          }}
          visible={showCreateSheet}
        />
      ) : null}
    </View>
  );
}
