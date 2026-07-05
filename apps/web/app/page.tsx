import Link from "next/link";

import { AuthStatus } from "../components/auth/auth-status";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center">
      <AuthStatus />
      <h1 className="text-4xl font-medium tracking-tight">Imprint</h1>
      <p className="mt-3 text-sm text-ink-muted">v2 · в разработке</p>
      <Link
        href="/sign-in"
        className="mt-8 inline-flex h-10 items-center justify-center rounded-control border border-line bg-night-700 px-4 text-sm font-medium transition-colors hover:border-line-strong"
      >
        Войти
      </Link>
    </main>
  );
}
