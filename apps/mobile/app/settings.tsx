import {
  useChangeEmail,
  useChangePassword,
  useCurrentUserAccount,
  useDeleteAccount,
  useUpdateUserSettings
} from "@imprint/api/users";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { signOut } from "../src/services/auth";

function Section({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-6 rounded-[28px] border border-white/10 bg-white/5 p-5">
      <Text className="text-lg font-semibold text-white">{title}</Text>
      {description ? (
        <Text className="mt-2 text-sm leading-6 text-stone-400">{description}</Text>
      ) : null}
      <View className="mt-4 gap-4">{children}</View>
    </View>
  );
}

function LabeledSwitch({
  label,
  value,
  onValueChange,
  helper
}: {
  label: string;
  value: boolean;
  onValueChange: (nextValue: boolean) => void;
  helper?: string;
}) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <View className="flex-1">
        <Text className="text-sm font-medium text-white">{label}</Text>
        {helper ? <Text className="mt-1 text-xs leading-5 text-stone-400">{helper}</Text> : null}
      </View>
      <Switch onValueChange={onValueChange} value={value} />
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const accountQuery = useCurrentUserAccount();
  const settingsMutation = useUpdateUserSettings();
  const changeEmailMutation = useChangeEmail();
  const changePasswordMutation = useChangePassword();
  const deleteAccountMutation = useDeleteAccount();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const account = accountQuery.data;
  const liveVisibility = useMemo(
    () => account?.defaultLiveVisibility ?? "friends",
    [account?.defaultLiveVisibility]
  );

  const persistSettings = async (
    nextValues: Partial<{
      echoesEnabled: boolean;
      notificationsEnabled: boolean;
      defaultLiveVisibility: "friends" | "community" | "hidden";
    }>
  ) => {
    setInlineError(null);
    try {
      await settingsMutation.mutateAsync(nextValues);
      await queryClient.invalidateQueries({ queryKey: ["account", "me"] });
      await Haptics.selectionAsync();
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : "Couldn’t save settings.");
    }
  };

  const handleSignOut = async () => {
    setInlineError(null);
    try {
      await signOut();
      router.replace("/sign-in");
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : "Couldn’t sign out.");
    }
  };

  const handleChangeEmail = async () => {
    setInlineError(null);
    try {
      await changeEmailMutation.mutateAsync(email);
      setEmail("");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : "Couldn’t update your email.");
    }
  };

  const handleChangePassword = async () => {
    setInlineError(null);
    try {
      await changePasswordMutation.mutateAsync(password);
      setPassword("");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : "Couldn’t update your password.");
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      "Delete account?",
      "This deletes your profile and cascades through your app data. You will be signed out immediately.",
      [
        { style: "cancel", text: "Cancel" },
        {
          style: "destructive",
          text: "Delete account",
          onPress: () => {
            void (async () => {
              try {
                await deleteAccountMutation.mutateAsync();
                router.replace("/sign-in");
              } catch (error) {
                setInlineError(
                  error instanceof Error ? error.message : "Couldn’t delete your account."
                );
              }
            })();
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-stone-950">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingBottom: insets.bottom + 32
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5">
          <View className="mb-6 flex-row items-center justify-between">
            <View>
              <Text className="text-3xl font-semibold text-white">Settings</Text>
              <Text className="mt-2 text-sm text-stone-400">
                Privacy, account access, and live map behavior.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              className="rounded-full border border-white/10 px-4 py-3"
              onPress={() => {
                router.back();
              }}
            >
              <Text className="text-sm font-medium text-stone-200">Close</Text>
            </Pressable>
          </View>

          {accountQuery.isLoading ? (
            <View className="items-center py-20">
              <ActivityIndicator color="#38bdf8" />
            </View>
          ) : account ? (
            <>
              <Section
                description="Control how your live map and Echoes behave across devices."
                title="Privacy"
              >
                <LabeledSwitch
                  helper="When disabled, background Echo notifications stop."
                  label="Echoes"
                  onValueChange={(nextValue) => {
                    void persistSettings({ echoesEnabled: nextValue });
                  }}
                  value={account.echoesEnabled}
                />
                <LabeledSwitch
                  helper="Keeps local notification delivery enabled for account events."
                  label="Notifications"
                  onValueChange={(nextValue) => {
                    void persistSettings({ notificationsEnabled: nextValue });
                  }}
                  value={account.notificationsEnabled}
                />
                <View>
                  <Text className="mb-2 text-sm font-medium text-white">Live sharing mode</Text>
                  <View className="flex-row gap-3">
                    {(["hidden", "friends", "community"] as const).map((mode) => (
                      <Pressable
                        accessibilityRole="button"
                        className={`flex-1 rounded-2xl border px-3 py-3 ${
                          liveVisibility === mode
                            ? "border-sky-400 bg-sky-400/10"
                            : "border-white/10 bg-black/20"
                        }`}
                        key={mode}
                        onPress={() => {
                          void persistSettings({ defaultLiveVisibility: mode });
                        }}
                      >
                        <Text className="text-center text-sm font-medium capitalize text-white">
                          {mode}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </Section>

              <Section
                description="Supabase sends verification emails for email updates when configured."
                title="Account"
              >
                <View>
                  <Text className="mb-2 text-xs uppercase tracking-[1.6px] text-stone-500">
                    Current email
                  </Text>
                  <Text className="text-sm text-stone-200">{account.email ?? "Unavailable"}</Text>
                </View>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="rounded-3xl border border-white/10 bg-black/20 px-4 py-4 text-white"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="New email"
                  placeholderTextColor="#78716c"
                  value={email}
                />
                <Pressable
                  accessibilityRole="button"
                  className="items-center rounded-full bg-sky-400 px-5 py-4"
                  disabled={changeEmailMutation.isPending}
                  onPress={() => {
                    void handleChangeEmail();
                  }}
                >
                  <Text className="text-base font-semibold text-stone-950">Change email</Text>
                </Pressable>
                <TextInput
                  className="rounded-3xl border border-white/10 bg-black/20 px-4 py-4 text-white"
                  onChangeText={setPassword}
                  placeholder="New password"
                  placeholderTextColor="#78716c"
                  secureTextEntry
                  value={password}
                />
                <Pressable
                  accessibilityRole="button"
                  className="items-center rounded-full border border-white/10 px-5 py-4"
                  disabled={changePasswordMutation.isPending}
                  onPress={() => {
                    void handleChangePassword();
                  }}
                >
                  <Text className="text-base font-medium text-white">Change password</Text>
                </Pressable>
              </Section>

              <Section description="Use this if you want to leave the app on this device." title="Session">
                <Pressable
                  accessibilityRole="button"
                  className="items-center rounded-full border border-white/10 px-5 py-4"
                  onPress={() => {
                    void handleSignOut();
                  }}
                >
                  <Text className="text-base font-medium text-white">Sign out</Text>
                </Pressable>
              </Section>

              <Section
                description="Deleting your account also removes your app-owned data through cascading foreign keys."
                title="Danger zone"
              >
                <Pressable
                  accessibilityRole="button"
                  className="items-center rounded-full bg-rose-500/85 px-5 py-4"
                  disabled={deleteAccountMutation.isPending}
                  onPress={confirmDeleteAccount}
                >
                  <Text className="text-base font-semibold text-white">Delete account</Text>
                </Pressable>
              </Section>
            </>
          ) : (
            <View className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <Text className="text-white">Couldn’t load your account settings.</Text>
            </View>
          )}

          {inlineError ? (
            <View className="rounded-3xl border border-rose-400/30 bg-rose-500/15 px-4 py-3">
              <Text className="text-sm leading-6 text-rose-100">{inlineError}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
