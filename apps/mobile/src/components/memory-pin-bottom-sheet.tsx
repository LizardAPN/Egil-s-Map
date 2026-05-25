import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import type { MemoryPinMapItem } from "@imprint/api/mobile";

interface MemoryPinBottomSheetProps {
  pin: MemoryPinMapItem | null | undefined;
  isLoading: boolean;
  isOffline: boolean;
  errorMessage?: string | null;
  onClose: () => void;
}

const SHEET_HEIGHT = 260;

function formatPinnedDate(dateString: string | undefined) {
  if (!dateString) {
    return "Unknown date";
  }

  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function SkeletonRow() {
  const shimmerTranslate = useRef(new Animated.Value(-220)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerTranslate, {
        toValue: 220,
        duration: 1200,
        useNativeDriver: true
      })
    );

    animation.start();
    return () => {
      animation.stop();
    };
  }, [shimmerTranslate]);

  return (
    <View className="overflow-hidden rounded-2xl bg-white/5">
      <Animated.View
        pointerEvents="none"
        style={{
          transform: [{ translateX: shimmerTranslate }]
        }}
      >
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.18)", "transparent"]}
          end={{ x: 1, y: 0.5 }}
          start={{ x: 0, y: 0.5 }}
          style={{
            height: 140,
            width: 180
          }}
        />
      </Animated.View>
      <View className="absolute inset-0 gap-3 p-4">
        <View className="h-4 w-32 rounded-full bg-white/10" />
        <View className="h-3 w-24 rounded-full bg-white/10" />
        <View className="mt-4 h-24 rounded-2xl bg-white/10" />
        <View className="h-11 rounded-full bg-white/10" />
      </View>
    </View>
  );
}

export function MemoryPinBottomSheet({
  pin,
  isLoading,
  isOffline,
  errorMessage,
  onClose
}: MemoryPinBottomSheetProps) {
  const { width } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT + 40)).current;
  const isVisible = isLoading || pin !== null || Boolean(errorMessage);
  const thumbnail = useMemo(() => pin?.thumbnailUrl ?? pin?.mediaUrls[0], [pin]);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isVisible ? 0 : SHEET_HEIGHT + 40,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
      mass: 0.9
    }).start();
  }, [isVisible, translateY]);

  return (
    <Animated.View
      pointerEvents={isVisible ? "auto" : "none"}
      style={{
        transform: [{ translateY }],
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0
      }}
    >
      <View
        className="rounded-t-[28px] border border-white/10 bg-stone-950/95 px-5 pb-8 pt-3"
        style={{ minHeight: SHEET_HEIGHT }}
      >
        <View className="mb-4 items-center">
          <View className="h-1.5 w-14 rounded-full bg-white/20" />
        </View>

        {isLoading ? (
          <SkeletonRow />
        ) : errorMessage ? (
          <View className="flex-1 justify-center gap-4">
            <Text className="text-lg font-semibold text-white">Memory unavailable</Text>
            <Text className="text-sm leading-6 text-stone-300">{errorMessage}</Text>
            <View className="flex-row justify-end">
              <Pressable
                accessibilityRole="button"
                className="rounded-full bg-stone-800 px-4 py-3"
                onPress={onClose}
              >
                <Text className="text-sm font-semibold text-white">Dismiss</Text>
              </Pressable>
            </View>
          </View>
        ) : pin ? (
          <View className="gap-4">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-xl font-semibold text-white">{pin.title}</Text>
                <Text className="mt-1 text-sm text-stone-400">
                  {formatPinnedDate(pin.pinnedAt)}
                </Text>
                <Text className="mt-2 text-sm text-stone-300">
                  {pin.chapter?.title ?? "Unsorted chapter"}
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

            {thumbnail ? (
              <Image
                contentFit="cover"
                source={{ uri: thumbnail }}
                style={{
                  width: width - 40,
                  height: 112,
                  borderRadius: 20
                }}
              />
            ) : (
              <View className="h-28 items-center justify-center rounded-3xl bg-white/5">
                <Text className="text-sm text-stone-400">No media for this memory yet.</Text>
              </View>
            )}

            <View className="flex-row items-center justify-between">
              <Text className="max-w-[55%] text-xs uppercase tracking-[1.6px] text-stone-500">
                {isOffline ? "Offline: showing cached details when available." : " "}
              </Text>
              <Pressable
                accessibilityRole="button"
                className="rounded-full bg-sky-400 px-5 py-3"
                onPress={() => {
                  router.push(`/pin/${pin.id}`);
                }}
              >
                <Text className="text-sm font-semibold text-stone-950">Open full story</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#38bdf8" />
          </View>
        )}
      </View>
    </Animated.View>
  );
}
