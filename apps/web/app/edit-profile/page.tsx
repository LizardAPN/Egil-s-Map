"use client";

import { useCurrentUserAccount, useUpdateProfile } from "@imprint/api/users";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";

export default function EditProfilePage() {
  const router = useRouter();
  const { data: account, isLoading } = useCurrentUserAccount();
  const updateProfile = useUpdateProfile();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!account) {
      return;
    }
    setDisplayName(account.displayName);
    setUsername(account.username);
    setBio(account.bio ?? "");
    setWebsite(account.website ?? "");
  }, [account]);

  if (isLoading || !account) {
    return (
      <main className="app-page">
        <Spinner />
      </main>
    );
  }

  const handleSave = async () => {
    setError(null);
    try {
      await updateProfile.mutateAsync({
        displayName,
        username,
        bio,
        website,
        avatarAsset: null
      });
      router.push("/profile");
    } catch {
      setError("Couldn't update your profile. Try again?");
    }
  };

  return (
    <main className="app-page">
      <h1>Edit profile</h1>
      <label className="app-field">
        <span>Display name</span>
        <input value={displayName} onChange={(event) => { setDisplayName(event.target.value); }} />
      </label>
      <label className="app-field">
        <span>Username</span>
        <input value={username} onChange={(event) => { setUsername(event.target.value); }} />
      </label>
      <label className="app-field">
        <span>Bio</span>
        <textarea value={bio} onChange={(event) => { setBio(event.target.value); }} rows={3} />
      </label>
      <label className="app-field">
        <span>Website</span>
        <input value={website} onChange={(event) => { setWebsite(event.target.value); }} />
      </label>
      {error ? <p className="app-error">{error}</p> : null}
      <div className="app-auth-actions">
        <Button onClick={handleSave}>Save</Button>
      </div>
    </main>
  );
}
