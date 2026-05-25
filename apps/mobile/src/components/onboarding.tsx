import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Text,
  View
} from "react-native";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GLOBE_ANIMATION = require("../../assets/lottie/imprint-globe.json");

export function useReduceMotionPreference() {
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) {
        setReduceMotionEnabled(value);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotionEnabled
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotionEnabled;
}

function useLoopedValue(enabled: boolean, duration: number, maxValue = 1) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animatedValue.stopAnimation();
    animatedValue.setValue(0);

    if (!enabled) {
      return;
    }

    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: maxValue,
        duration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      })
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [animatedValue, duration, enabled, maxValue]);

  return animatedValue;
}

export function OnboardingScaffold({
  title,
  body,
  ctaLabel,
  onCtaPress,
  visual,
  footer,
  disabled = false,
  isBusy = false
}: {
  title: string;
  body: string;
  ctaLabel: string;
  onCtaPress: () => void;
  visual: ReactNode;
  footer?: ReactNode;
  disabled?: boolean;
  isBusy?: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#020617", "#0f172a", "#111827"]}
      locations={[0, 0.55, 1]}
      style={{ flex: 1 }}
    >
      <ScrollView
        bounces={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 24,
          paddingBottom: Math.max(insets.bottom, 24) + 24
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-6">
          <View className="flex-1 items-center justify-center pt-6">{visual}</View>
          <View className="mt-10">
            <Text className="text-center text-4xl font-semibold leading-tight text-white">
              {title}
            </Text>
            <Text className="mt-4 text-center text-base leading-7 text-slate-300">
              {body}
            </Text>
            {footer ? <View className="mt-6">{footer}</View> : null}
          </View>
          <Pressable
            accessibilityRole="button"
            className={`mt-10 items-center rounded-full px-6 py-4 ${
              disabled ? "bg-slate-700" : "bg-sky-400"
            }`}
            disabled={disabled || isBusy}
            onPress={onCtaPress}
          >
            {isBusy ? (
              <ActivityIndicator color={disabled ? "#e2e8f0" : "#020617"} />
            ) : (
              <Text className="text-base font-semibold text-slate-950">{ctaLabel}</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

export function WelcomeVisual() {
  const reduceMotionEnabled = useReduceMotionPreference();
  const shimmer = useLoopedValue(!reduceMotionEnabled, 4800);
  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-18, 18]
  });

  return (
    <View className="h-[320px] w-full items-center justify-center">
      <View className="absolute h-72 w-72 rounded-full bg-sky-400/10" />
      <View className="absolute h-56 w-56 rounded-full border border-white/10" />
      {reduceMotionEnabled ? (
        <View className="h-60 w-60 items-center justify-center rounded-full border border-sky-300/40 bg-slate-950">
          <View className="absolute h-44 w-44 rounded-full border border-sky-300/20" />
          <View className="absolute h-32 w-32 rounded-full border border-sky-300/20" />
          <View className="absolute h-52 w-[2px] bg-sky-200/30" />
          <View className="absolute h-[2px] w-52 bg-sky-200/30" />
          <View className="h-5 w-5 rounded-full bg-sky-300" />
        </View>
      ) : (
        <View className="h-72 w-72 overflow-hidden rounded-full">
          <LottieView autoPlay loop source={GLOBE_ANIMATION} style={{ height: 288, width: 288 }} />
        </View>
      )}
      <Animated.View
        className="absolute bottom-8 h-16 w-52 rounded-full bg-sky-400/15"
        style={{
          transform: [{ translateX }]
        }}
      />
    </View>
  );
}

export function MemoryMapVisual() {
  const reduceMotionEnabled = useReduceMotionPreference();
  const pulse = useLoopedValue(!reduceMotionEnabled, 2200);
  const pinScale = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.92, 1.05, 0.92]
  });
  const secondPinScale = pulse.interpolate({
    inputRange: [0, 0.35, 0.7, 1],
    outputRange: [0.85, 1.05, 0.9, 0.85]
  });

  return (
    <View className="h-[320px] w-full items-center justify-center">
      <View className="h-72 w-full overflow-hidden rounded-[40px] border border-white/10 bg-slate-950 px-5 py-6">
        <View className="absolute inset-0 bg-slate-950" />
        <View className="absolute left-6 top-8 h-48 w-48 rounded-full bg-sky-400/8" />
        <View className="absolute right-6 top-16 h-28 w-28 rounded-full bg-emerald-300/8" />
        <View className="absolute inset-x-8 top-12 h-[1px] bg-white/8" />
        <View className="absolute inset-x-12 top-28 h-[1px] bg-white/8" />
        <View className="absolute inset-x-10 top-44 h-[1px] bg-white/8" />
        <View className="absolute bottom-16 left-14 h-24 w-[1px] bg-white/8" />
        <View className="absolute bottom-12 left-36 h-32 w-[1px] bg-white/8" />
        <View className="absolute bottom-16 right-16 h-20 w-[1px] bg-white/8" />
        <Animated.View
          className="absolute left-14 top-24 h-5 w-5 rounded-full bg-amber-300 shadow-2xl"
          style={{ transform: [{ scale: reduceMotionEnabled ? 1 : pinScale }] }}
        />
        <Animated.View
          className="absolute right-16 top-32 h-4 w-4 rounded-full bg-sky-300"
          style={{ transform: [{ scale: reduceMotionEnabled ? 1 : secondPinScale }] }}
        />
        <Animated.View
          className="absolute bottom-16 left-1/2 h-6 w-6 -translate-x-3 rounded-full bg-rose-300"
          style={{ transform: [{ scale: reduceMotionEnabled ? 1 : pinScale }] }}
        />
        <View className="absolute bottom-6 left-6 rounded-full bg-white/5 px-4 py-2">
          <Text className="text-xs font-medium uppercase tracking-[1.6px] text-slate-300">
            City stories appearing
          </Text>
        </View>
      </View>
    </View>
  );
}

export function ChaptersVisual() {
  const reduceMotionEnabled = useReduceMotionPreference();
  const stack = useLoopedValue(!reduceMotionEnabled, 3000);
  const topCard = stack.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -8, 0]
  });
  const middleCard = stack.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 6, 0]
  });

  return (
    <View className="h-[320px] w-full items-center justify-center">
      <View className="h-72 w-full items-center justify-center">
        <Animated.View
          className="absolute h-52 w-[78%] rounded-[36px] bg-rose-400/85 px-6 py-5"
          style={{ transform: [{ rotate: "-8deg" }, { translateY: reduceMotionEnabled ? 0 : 18 }] }}
        >
          <Text className="text-xs font-medium uppercase tracking-[1.6px] text-white/80">
            Alps summer
          </Text>
          <Text className="mt-3 text-3xl font-semibold text-white">June to August</Text>
        </Animated.View>
        <Animated.View
          className="absolute h-56 w-[84%] rounded-[40px] bg-sky-400/88 px-6 py-5"
          style={{ transform: [{ rotate: "4deg" }, { translateY: reduceMotionEnabled ? 0 : middleCard }] }}
        >
          <Text className="text-xs font-medium uppercase tracking-[1.6px] text-slate-950/80">
            My startup journey
          </Text>
          <Text className="mt-3 text-3xl font-semibold text-slate-950">Late nights, first launch</Text>
        </Animated.View>
        <Animated.View
          className="absolute h-60 w-[88%] rounded-[42px] bg-emerald-300 px-6 py-6"
          style={{ transform: [{ rotate: "-2deg" }, { translateY: reduceMotionEnabled ? 0 : topCard }] }}
        >
          <Text className="text-xs font-medium uppercase tracking-[1.6px] text-slate-950/70">
            Tokyo 2024
          </Text>
          <Text className="mt-3 text-4xl font-semibold text-slate-950">A city chapter you can reopen</Text>
        </Animated.View>
      </View>
    </View>
  );
}

export function LiveMapVisual() {
  const reduceMotionEnabled = useReduceMotionPreference();
  const drift = useLoopedValue(!reduceMotionEnabled, 2600);
  const leftDot = drift.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-4, 8, -4]
  });
  const rightDot = drift.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [6, -6, 6]
  });

  return (
    <View className="h-[320px] w-full items-center justify-center">
      <View className="h-72 w-full overflow-hidden rounded-[40px] border border-white/10 bg-slate-950">
        <View className="absolute inset-x-6 top-14 h-[1px] bg-white/8" />
        <View className="absolute inset-x-10 top-28 h-[1px] bg-white/8" />
        <View className="absolute inset-x-8 top-44 h-[1px] bg-white/8" />
        <View className="absolute bottom-14 left-12 h-24 w-[1px] bg-white/8" />
        <View className="absolute bottom-10 left-1/2 h-28 w-[1px] -translate-x-[0.5px] bg-white/8" />
        <View className="absolute bottom-14 right-12 h-20 w-[1px] bg-white/8" />
        <Animated.View
          className="absolute left-12 top-24 h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-sky-400/20"
          style={{ transform: [{ translateX: reduceMotionEnabled ? 0 : leftDot }] }}
        >
          <Image
            contentFit="cover"
            source={{ uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80" }}
            style={{ width: 44, height: 44, borderRadius: 999 }}
          />
        </Animated.View>
        <Animated.View
          className="absolute right-14 top-32 h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-emerald-300/20"
          style={{ transform: [{ translateX: reduceMotionEnabled ? 0 : rightDot }] }}
        >
          <View className="h-4 w-4 rounded-full bg-emerald-300 shadow-2xl" />
        </Animated.View>
        <View className="absolute bottom-16 left-24 h-4 w-4 rounded-full bg-rose-300/90" />
        <View className="absolute bottom-20 right-24 h-3 w-3 rounded-full bg-amber-300/90" />
        <View className="absolute bottom-6 left-6 right-6 rounded-[28px] border border-white/10 bg-black/30 px-4 py-4">
          <Text className="text-sm font-semibold text-white">Privacy-first live sharing</Text>
          <Text className="mt-1 text-sm leading-6 text-slate-300">
            Hidden by default. Friends or community only when you opt in.
          </Text>
        </View>
      </View>
    </View>
  );
}

export function PermissionCard({
  title,
  description,
  stateLabel,
  onPress
}: {
  title: string;
  description: string;
  stateLabel: string;
  onPress: () => void;
}) {
  return (
    <View className="rounded-[28px] border border-white/10 bg-white/5 px-5 py-5">
      <View className="flex-row items-start justify-between">
        <View className="mr-4 flex-1">
          <Text className="text-lg font-semibold text-white">{title}</Text>
          <Text className="mt-2 text-sm leading-6 text-slate-300">{description}</Text>
        </View>
        <Text className="text-xs font-medium uppercase tracking-[1.4px] text-sky-200">
          {stateLabel}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        className="mt-4 self-start rounded-full border border-white/10 bg-slate-900 px-4 py-3"
        onPress={onPress}
      >
        <Text className="text-sm font-semibold text-white">Allow</Text>
      </Pressable>
    </View>
  );
}
