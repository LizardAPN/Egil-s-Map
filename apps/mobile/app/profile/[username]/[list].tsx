import {
  useFollowers,
  useFollowing,
  type FollowListUser
} from "@imprint/api/users";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
  type ListRenderItem
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfilePageByUsername } from "@imprint/api/chapters";

function getRelationshipLabel(relationship: FollowListUser["relationship"]) {
  switch (relationship) {
    case "friend":
      return "Friend";
    case "following":
      return "Following";
    case "follower":
      return "Follows you";
    case "self":
      return "You";
    default:
      return null;
  }
}

export default function FollowListScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ username: string; list: string }>();
  const username = typeof params.username === "string" ? params.username : "";
  const list = params.list === "following" ? "following" : "followers";
  const profileQuery = useProfilePageByUsername(username, username.length > 0);
  const userId = profileQuery.data?.profile.id ?? "";
  const followersQuery = useFollowers(userId, Boolean(userId) && list === "followers");
  const followingQuery = useFollowing(userId, Boolean(userId) && list === "following");
  const activeQuery = list === "followers" ? followersQuery : followingQuery;
  const data: FollowListUser[] = activeQuery.data ?? [];
  const keyExtractor = (item: FollowListUser) => item.id;
  const renderItem: ListRenderItem<FollowListUser> = ({ item }) => {
    const relationshipLabel = getRelationshipLabel(item.relationship);

    return (
      <Pressable
        accessibilityRole="button"
        className="mx-5 mb-3 flex-row items-center rounded-[28px] border border-white/10 bg-white/5 px-4 py-4"
        onPress={() => {
          router.push(`/profile/${item.username}`);
        }}
      >
        {item.avatarUrl ? (
          <Image
            contentFit="cover"
            source={{ uri: item.avatarUrl }}
            style={{ width: 52, height: 52, borderRadius: 999 }}
          />
        ) : (
          <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-sky-400">
            <Text className="text-lg font-semibold text-stone-950">
              {item.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View className="ml-4 flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-semibold text-white">{item.displayName}</Text>
            {relationshipLabel ? (
              <View className="rounded-full bg-white/10 px-2 py-1">
                <Text className="text-[10px] font-medium uppercase tracking-[1.4px] text-stone-300">
                  {relationshipLabel}
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="mt-1 text-sm text-stone-400">@{item.username}</Text>
          <Text className="mt-2 text-sm leading-6 text-stone-300">
            {item.bio ?? "Mapping stories and places."}
          </Text>
        </View>
      </Pressable>
    );
  };

  if (profileQuery.isLoading || (Boolean(userId) && activeQuery.isLoading)) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-950">
        <ActivityIndicator color="#38bdf8" />
      </View>
    );
  }

  if (!profileQuery.data) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-950 px-6">
        <Text className="text-center text-xl font-semibold text-white">List unavailable</Text>
        <Text className="mt-3 text-center text-sm text-stone-300">
          This follow list could not be loaded.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-stone-950" style={{ paddingTop: insets.top + 8 }}>
      <View className="border-b border-white/10 px-5 pb-4">
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            className="rounded-full border border-white/10 px-3 py-2"
            onPress={() => {
              router.back();
            }}
          >
            <Text className="text-xs font-medium uppercase tracking-[1.6px] text-stone-300">
              Back
            </Text>
          </Pressable>
          <Text className="text-sm text-stone-400">@{profileQuery.data.profile.username}</Text>
        </View>
        <Text className="mt-4 text-3xl font-semibold text-white">
          {list === "followers" ? "Followers" : "Following"}
        </Text>
      </View>

      <View className="flex-row gap-3 px-5 py-4">
        <Pressable
          accessibilityRole="button"
          className={`rounded-full px-4 py-3 ${
            list === "followers" ? "bg-sky-400" : "bg-white/5"
          }`}
          onPress={() => {
            router.replace(`/profile/${profileQuery.data.profile.username}/followers`);
          }}
        >
          <Text
            className={`text-sm font-semibold ${
              list === "followers" ? "text-stone-950" : "text-white"
            }`}
          >
            Followers
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          className={`rounded-full px-4 py-3 ${
            list === "following" ? "bg-sky-400" : "bg-white/5"
          }`}
          onPress={() => {
            router.replace(`/profile/${profileQuery.data.profile.username}/following`);
          }}
        >
          <Text
            className={`text-sm font-semibold ${
              list === "following" ? "text-stone-950" : "text-white"
            }`}
          >
            Following
          </Text>
        </Pressable>
      </View>

      <FlatList<FollowListUser>
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
        data={data}
        keyExtractor={keyExtractor}
        ListEmptyComponent={
          <View className="px-5 pt-12">
            <Text className="text-center text-lg font-semibold text-white">
              {list === "followers" ? "No followers yet" : "Not following anyone yet"}
            </Text>
            <Text className="mt-3 text-center text-sm leading-6 text-stone-400">
              {list === "followers"
                ? "This profile has not attracted a circle yet."
                : "This profile has not started following other explorers yet."}
            </Text>
          </View>
        }
        renderItem={renderItem}
      />
    </View>
  );
}
