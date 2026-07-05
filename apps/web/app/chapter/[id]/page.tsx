"use client";

import { useChapterDetail } from "@imprint/api/chapters";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Spinner } from "../../../components/ui/Spinner";

export default function ChapterDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: chapter, isLoading, error } = useChapterDetail(params.id);

  if (isLoading) {
    return (
      <main className="app-page">
        <Spinner label="Loading chapter…" />
      </main>
    );
  }

  if (error || !chapter) {
    return (
      <main className="app-page">
        <p className="app-error">Couldn't load this chapter.</p>
      </main>
    );
  }

  return (
    <main className="app-page">
      <p className="app-muted" style={{ color: chapter.color }}>
        Chapter
      </p>
      <h1>{chapter.title}</h1>
      {chapter.description ? <p>{chapter.description}</p> : null}

      <h2>Memories</h2>
      {chapter.pins.length === 0 ? (
        <div className="app-empty">No memories in this chapter yet.</div>
      ) : (
        <ul>
          {chapter.pins.map((pin) => (
            <li key={pin.id} style={{ marginBottom: 12 }}>
              <Link href={`/pin/${pin.id}`} className="app-link">
                {pin.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
