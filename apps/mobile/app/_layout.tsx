import { Stack } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProviders } from "../src/providers/app-providers";
import {
  initializeEchoes,
  registerEchoNotificationResponseHandler
} from "../src/services/echoService";

export default function RootLayout() {
  useEffect(() => {
    void initializeEchoes();
    const subscription = registerEchoNotificationResponseHandler();

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <Stack screenOptions={{ headerShown: false }} />
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
