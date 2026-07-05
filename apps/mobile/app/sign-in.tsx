import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  formatAuthError,
  signInWithEmail,
  signUpWithEmail,
  startOAuthSignIn
} from "../src/services/auth";
import { getSupabaseUrlDevHint } from "../src/services/supabase-dev-hint";
import { getOnboardingCompleted } from "../src/services/onboarding";

async function routeAfterAuth() {
  const completed = await getOnboardingCompleted();
  router.replace(completed ? "/(tabs)/map" : "/onboarding");
}

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const supabaseDevHint = getSupabaseUrlDevHint();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const canSubmit = email.trim().length > 0 && password.length >= 6;

  const handleSignIn = async () => {
    setInlineError(null);
    setIsBusy(true);
    try {
      const session = await signInWithEmail(email, password);
      if (!session) {
        setInlineError("Check your email to confirm your account, then sign in.");
        return;
      }
      await routeAfterAuth();
    } catch (error) {
      setInlineError(formatAuthError(error));
    } finally {
      setIsBusy(false);
    }
  };

  const handleSignUp = async () => {
    setInlineError(null);
    setIsBusy(true);
    try {
      const session = await signUpWithEmail(email, password);
      if (!session) {
        setInlineError("Account created. Confirm your email if required, then sign in.");
        return;
      }
      await routeAfterAuth();
    } catch (error) {
      setInlineError(formatAuthError(error));
    } finally {
      setIsBusy(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setInlineError(null);
    setIsBusy(true);
    try {
      await startOAuthSignIn(provider);
    } catch (error) {
      setInlineError(formatAuthError(error));
      setIsBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-stone-950"
      style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-semibold text-white">Imprint</Text>
        <Text className="mt-2 text-base text-stone-400">
          Sign in to save memories and sync your map.
        </Text>

        {supabaseDevHint ? (
          <View className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
            <Text className="text-sm leading-6 text-amber-100">{supabaseDevHint}</Text>
          </View>
        ) : null}

        <View className="mt-8 gap-4">
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#78716c"
            textContentType="emailAddress"
            value={email}
          />
          <TextInput
            autoCapitalize="none"
            autoComplete="password-new"
            className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-base text-white"
            onChangeText={setPassword}
            placeholder="Password (min 6 characters)"
            placeholderTextColor="#78716c"
            secureTextEntry
            textContentType="password"
            value={password}
          />
        </View>

        {inlineError ? (
          <Text className="mt-4 text-sm leading-6 text-rose-200">{inlineError}</Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          className={`mt-6 items-center rounded-full px-5 py-4 ${isBusy || !canSubmit ? "bg-sky-400/50" : "bg-sky-400"}`}
          disabled={isBusy || !canSubmit}
          onPress={() => {
            void handleSignIn();
          }}
        >
          {isBusy ? (
            <ActivityIndicator color="#09090b" />
          ) : (
            <Text className="text-base font-semibold text-stone-950">Sign in</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          className="mt-3 items-center rounded-full border border-white/15 px-5 py-4"
          disabled={isBusy || !canSubmit}
          onPress={() => {
            void handleSignUp();
          }}
        >
          <Text className="text-base font-medium text-stone-200">Create account</Text>
        </Pressable>

        <View className="mt-6 gap-3">
          <Pressable
            accessibilityRole="button"
            className="items-center rounded-full border border-white/15 px-5 py-4"
            disabled={isBusy}
            onPress={() => {
              void handleOAuth("google");
            }}
          >
            <Text className="text-base font-medium text-stone-200">Continue with Google</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            className="items-center rounded-full border border-white/15 px-5 py-4"
            disabled={isBusy}
            onPress={() => {
              void handleOAuth("apple");
            }}
          >
            <Text className="text-base font-medium text-stone-200">Continue with Apple</Text>
          </Pressable>
        </View>

        <Text className="mt-6 text-center text-xs leading-5 text-stone-500">
          Use the same Supabase project as in apps/mobile/.env. Create a user in Supabase
          Dashboard → Authentication if needed.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
