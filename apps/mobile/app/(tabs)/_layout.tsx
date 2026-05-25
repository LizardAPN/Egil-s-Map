import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          display: "none"
        }
      }}
    >
      <Tabs.Screen name="map" options={{ title: "Map" }} />
      <Tabs.Screen name="discover" options={{ title: "Discover" }} />
      <Tabs.Screen name="live" options={{ title: "Live" }} />
    </Tabs>
  );
}
