import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { getOnboardingCompleted } from "../src/services/onboarding";

export default function IndexScreen() {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const completed = await getOnboardingCompleted();
      if (!mounted) {
        return;
      }

      router.replace(completed ? "/(tabs)/map" : "/onboarding");
      setIsChecking(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-slate-950 px-6">
      <ActivityIndicator color="#38bdf8" />
      {isChecking ? (
        <Text className="mt-4 text-sm text-slate-300">Preparing your map.</Text>
      ) : null}
    </View>
  );
}
