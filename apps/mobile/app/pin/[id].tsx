import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function PinDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 items-center justify-center bg-stone-950 px-6">
      <Text className="text-xl font-semibold text-white">Full Story</Text>
      <Text className="mt-3 text-sm text-stone-300">Pin ID: {id}</Text>
    </View>
  );
}
