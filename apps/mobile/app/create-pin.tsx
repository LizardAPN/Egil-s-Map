import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function CreatePinScreen() {
  const params = useLocalSearchParams<{ latitude?: string; longitude?: string }>();

  return (
    <View className="flex-1 items-center justify-center bg-stone-950 px-6">
      <Text className="text-xl font-semibold text-white">Create Pin</Text>
      <Text className="mt-3 text-center text-sm text-stone-300">
        Seed coordinates: {params.latitude ?? "unknown"}, {params.longitude ?? "unknown"}
      </Text>
    </View>
  );
}
