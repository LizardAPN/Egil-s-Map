"use client";

import { useCurrentUserChapters } from "@imprint/api/chapters";
import { useCurrentUserAccount } from "@imprint/api/users";
import Link from "next/link";
import { Spinner } from "../../../components/ui/Spinner";

export default function ProfilePage() {
  const { data: account, isLoading: accountLoading, error: accountError } = useCurrentUserAccount();
  const { data: chapters = [], isLoading: chaptersLoading } = useCurrentUserChapters();

  if (accountLoading) {
    return (
      <main className="app-page">
        <Spinner label="Loading profile…" />
      </main>
    );
  }

  if (accountError || !account) {
    return (
      <main className="app-page">
        <p className="app-error">Couldn't load your profile. Try again?</p>
      </main>
    );
  }

  return (
    <main className="app-page">
      <div className="app-header-row">
        <div>
          <h1>{account.displayName}</h1>
          <p className="app-muted">@{account.username}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/edit-profile" className="app-link">
            Edit
          </Link>
          <Link href="/settings" className="app-link">
            Settings
          </Link>
        </div>
      </div>

      {account.bio ? <p>{account.bio}</p> : null}

      <h2>Life chapters</h2>
      {chaptersLoading ? <Spinner label="Loading chapters…" /> : null}
      {!chaptersLoading && chapters.length === 0 ? (
        <div className="app-empty">No chapters yet. Create one from your first memory.</div>
      ) : (
        <div className="app-card-grid">
          {chapters.map((chapter) => (
            <Link key={chapter.id} href={`/chapter/${chapter.id}`} className="app-card">
              <strong style={{ color: chapter.color }}>{chapter.title}</strong>
              <p className="app-muted">{chapter.pinCount} memories</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
