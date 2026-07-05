import Link from "next/link";

export default function NotFound() {
  return (
    <main className="app-page">
      <h1>Lost on the map</h1>
      <p className="app-muted">This page doesn&apos;t exist.</p>
      <Link href="/" className="app-link">
        Back home
      </Link>
    </main>
  );
}
