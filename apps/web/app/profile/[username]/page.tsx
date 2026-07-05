"use client";

import { useProfilePageByUsername } from "@imprint/api/chapters";
import { useFollowUser, useUnfollowUser } from "@imprint/api/chapters";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "../../../components/ui/Button";
import { Spinner } from "../../../components/ui/Spinner";

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;
  const { data, isLoading, error, refetch } = useProfilePageByUsername(username);
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();

  if (isLoading) {
    return (
      <main className="app-page">
        <Spinner label="Loading profile…" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="app-page">
        <p className="app-error">Couldn't find that profile.</p>
      </main>
    );
  }

  const { profile, stats, chapters, isOwnProfile, isFollowing } = data;

  const handleFollow = async () => {
    if (isFollowing) {
      await unfollowUser.mutateAsync(profile.id);
    } else {
      await followUser.mutateAsync(profile.id);
    }
    await refetch();
  };

  return (
    <main className="app-page">
      <div className="app-header-row">
        <div>
          <h1>{profile.displayName}</h1>
          <p className="app-muted">@{profile.username}</p>
        </div>
        {!isOwnProfile ? <Button onClick={handleFollow}>{isFollowing ? "Unfollow" : "Follow"}</Button> : null}
      </div>

      {profile.bio ? <p>{profile.bio}</p> : null}

      <p className="app-muted">
        {stats.memories} memories · {stats.chapters} chapters
      </p>

      <div className="app-header-row">
        <Link href={`/profile/${username}/followers`} className="app-link">
          {stats.followers} followers
        </Link>
        <Link href={`/profile/${username}/following`} className="app-link">
          {stats.following} following
        </Link>
      </div>

      <h2>Chapters</h2>
      <div className="app-card-grid">
        {chapters.map((chapter) => (
          <Link key={chapter.id} href={`/chapter/${chapter.id}`} className="app-card">
            <strong style={{ color: chapter.color }}>{chapter.title}</strong>
            <p className="app-muted">{chapter.pinCount} memories</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
