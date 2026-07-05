"use client";

import { useProfilePageByUsername } from "@imprint/api/chapters";
import { useFollowers, useFollowing } from "@imprint/api/users";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Spinner } from "../../../../components/ui/Spinner";

export default function FollowListPage() {
  const params = useParams<{ username: string; list: string }>();
  const list = params.list;
  const isFollowers = list === "followers";

  const profileQuery = useProfilePageByUsername(params.username);
  const userId = profileQuery.data?.profile.id ?? "";

  const followersQuery = useFollowers(userId, isFollowers && userId.length > 0);
  const followingQuery = useFollowing(userId, !isFollowers && userId.length > 0);
  const activeQuery = isFollowers ? followersQuery : followingQuery;
  const users = activeQuery.data ?? [];

  if (profileQuery.isLoading || activeQuery.isLoading) {
    return (
      <main className="app-page">
        <Spinner />
      </main>
    );
  }

  return (
    <main className="app-page">
      <h1>{isFollowers ? "Followers" : "Following"}</h1>
      <p className="app-muted">@{params.username}</p>

      {users.length === 0 ? (
        <div className="app-empty">No one here yet.</div>
      ) : (
        <ul>
          {users.map((user) => (
            <li key={user.id} style={{ marginBottom: 12 }}>
              <Link href={`/profile/${user.username}`} className="app-link">
                {user.displayName} (@{user.username})
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
