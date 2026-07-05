import { isUsernameAvailable, useCurrentUserAccount, useUpdateProfile } from "@imprint/api/users";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const accountQuery = useCurrentUserAccount();
  const updateProfileMutation = useUpdateProfile();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [avatarAsset, setAvatarAsset] = useState<{
    uri: string;
    fileName?: string | undefined;
    mimeType?: string | undefined;
  } | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [inlineError, setInlineError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountQuery.data) {
      return;
    }

    setDisplayName(accountQuery.data.displayName);
    setUsername(accountQuery.data.username);
    setBio(accountQuery.data.bio ?? "");
    setWebsite(accountQuery.data.website ?? "");
  }, [accountQuery.data]);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setInlineError("Photo library access is required to upload an avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.9
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (!asset) {
      return;
    }

    setAvatarAsset({
      uri: asset.uri,
      fileName: asset.fileName ?? undefined,
      mimeType: asset.mimeType ?? undefined
    });
    setInlineError(null);
  };

  const validateUsername = async () => {
    if (!accountQuery.data) {
      return;
    }

    setUsernameStatus("checking");
    try {
      const available = await isUsernameAvailable(username, accountQuery.data.id);
      setUsernameStatus(available ? "available" : "taken");
      if (!available) {
        setInlineError("That username is already taken.");
      } else {
        setInlineError(null);
      }
    } catch (error) {
      setUsernameStatus("idle");
      setInlineError(error instanceof Error ? error.message : "Couldn’t validate username.");
    }
  };

  const handleSave = async () => {
    setInlineError(null);
    try {
      await updateProfileMutation.mutateAsync({
        displayName,
        username,
        bio,
        website,
        avatarAsset
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["account", "me"] }),
        queryClient.invalidateQueries({ queryKey: ["profile", "me"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-page", username] })
      ]);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : "Couldn’t save your profile.");
    }
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
              <Text className="text-3xl font-semibold text-white">Edit profile</Text>
              <Text className="mt-2 text-sm text-stone-400">
                Update how you appear across the map.
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
          ) : (
            <View className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <Pressable
                accessibilityRole="button"
                className="mb-5 items-center"
                onPress={() => {
                  void pickAvatar();
                }}
              >
                {avatarAsset?.uri || accountQuery.data?.avatarUrl ? (
                  <Image
                    contentFit="cover"
                    source={{ uri: avatarAsset?.uri ?? accountQuery.data?.avatarUrl }}
                    style={{ width: 104, height: 104, borderRadius: 999 }}
                  />
                ) : (
                  <View className="h-[104px] w-[104px] items-center justify-center rounded-full bg-sky-400">
                    <Text className="text-3xl font-semibold text-stone-950">
                      {(displayName || "I").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text className="mt-3 text-sm text-sky-200">Choose avatar</Text>
              </Pressable>

              <View className="gap-4">
                <TextInput
                  className="rounded-3xl border border-white/10 bg-black/20 px-4 py-4 text-white"
                  maxLength={60}
                  onChangeText={setDisplayName}
                  placeholder="Display name"
                  placeholderTextColor="#78716c"
                  value={displayName}
                />
                <TextInput
                  autoCapitalize="none"
                  className="rounded-3xl border border-white/10 bg-black/20 px-4 py-4 text-white"
                  maxLength={24}
                  onBlur={() => {
                    void validateUsername();
                  }}
                  onChangeText={(value) => {
                    setUsername(value.toLowerCase());
                    setUsernameStatus("idle");
                  }}
                  placeholder="username"
                  placeholderTextColor="#78716c"
                  value={username}
                />
                <Text className="text-xs text-stone-400">
                  {usernameStatus === "checking"
                    ? "Checking username…"
                    : usernameStatus === "taken"
                      ? "Username is taken."
                      : usernameStatus === "available"
                        ? "Username is available."
                        : "Use lowercase letters, numbers, dots, or underscores."}
                </Text>
                <TextInput
                  className="min-h-28 rounded-3xl border border-white/10 bg-black/20 px-4 py-4 text-white"
                  maxLength={160}
                  multiline
                  onChangeText={setBio}
                  placeholder="Bio"
                  placeholderTextColor="#78716c"
                  style={{ textAlignVertical: "top" }}
                  value={bio}
                />
                <TextInput
                  autoCapitalize="none"
                  className="rounded-3xl border border-white/10 bg-black/20 px-4 py-4 text-white"
                  onChangeText={setWebsite}
                  placeholder="https://your-site.com"
                  placeholderTextColor="#78716c"
                  value={website}
                />

                {inlineError ? (
                  <View className="rounded-3xl border border-rose-400/30 bg-rose-500/15 px-4 py-3">
                    <Text className="text-sm leading-6 text-rose-100">{inlineError}</Text>
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  className="items-center rounded-full bg-sky-400 px-5 py-4"
                  disabled={updateProfileMutation.isPending || usernameStatus === "taken"}
                  onPress={() => {
                    void handleSave();
                  }}
                >
                  {updateProfileMutation.isPending ? (
                    <ActivityIndicator color="#09090b" />
                  ) : (
                    <Text className="text-base font-semibold text-stone-950">Save profile</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
