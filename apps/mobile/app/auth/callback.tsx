import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { exchangeOAuthCodeForSession, formatAuthError } from "../../src/services/auth";
import { getOnboardingCompleted } from "../../src/services/onboarding";

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      if (typeof params.error_description === "string" && params.error_description.length > 0) {
        if (mounted) {
          setErrorMessage(params.error_description);
        }
        return;
      }

      if (typeof params.error === "string" && params.error.length > 0) {
        if (mounted) {
          setErrorMessage(params.error);
        }
        return;
      }

      if (typeof params.code !== "string" || params.code.length === 0) {
        if (mounted) {
          setErrorMessage("No OAuth code was returned.");
        }
        return;
      }

      try {
        await exchangeOAuthCodeForSession(params.code);
        const completed = await getOnboardingCompleted();

        if (!mounted) {
          return;
        }

        router.replace(completed ? "/(tabs)/map" : "/onboarding");
      } catch (error) {
        if (mounted) {
          setErrorMessage(formatAuthError(error));
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [params.code, params.error, params.error_description]);

  return (
    <View className="flex-1 items-center justify-center bg-stone-950 px-6">
      {errorMessage ? (
        <>
          <Text className="text-center text-xl font-semibold text-white">Sign-in failed</Text>
          <Text className="mt-3 text-center text-sm leading-6 text-stone-300">{errorMessage}</Text>
        </>
      ) : (
        <>
          <ActivityIndicator color="#38bdf8" />
          <Text className="mt-4 text-sm text-stone-300">Finishing sign-in…</Text>
        </>
      )}
    </View>
  );
}
