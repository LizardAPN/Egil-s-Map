"use client";

import { IconSearch } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createBrowserClient, getMyProfile } from "@imprint/api";
import { Button, cn } from "@imprint/ui";

const NAV_TABS = [
  { href: "/map", label: "Карта" },
  { href: "/chapters", label: "Главы" },
  { href: "/feed", label: "Лента" },
] as const;

function getInitials(username: string | undefined, email: string | undefined): string {
  if (username) {
    const parts = username.split(/[._-]/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    }
    return username.slice(0, 2).toUpperCase();
  }

  if (!email) {
    return "?";
  }

  const localPart = email.split("@")[0] ?? email;
  const parts = localPart.split(/[._-]/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  return localPart.slice(0, 2).toUpperCase();
}

function isActiveTab(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient();

    void (async () => {
      try {
        const profile = await getMyProfile(supabase);
        if (profile) {
          setUsername(profile.username);
        }
      } catch {
        // Profile read can fail before grants/RLS are applied — email fallback below.
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      setEmail(session?.user.email ?? null);
    })();
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/sign-in");
    router.refresh();
  }

  const displayName = username ?? email ?? "Пользователь";
  const initials = getInitials(username ?? undefined, email ?? undefined);

  return (
    <header className="pointer-events-auto fixed inset-x-0 top-0 z-20 border-b border-line-subtle bg-night-900/90 backdrop-blur-md">
      <div className="mx-auto flex h-[52px] items-center gap-6 px-4">
        <Link
          href="/map"
          className="font-display text-base text-ink-cream"
        >
          Imprint
        </Link>

        <nav className="flex items-center gap-4">
          {NAV_TABS.map((tab) => {
            const active = isActiveTab(pathname, tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "border-b-2 px-1 py-3 text-xs transition-colors",
                  active
                    ? "border-amber text-amber"
                    : "border-transparent text-ink-secondary hover:text-ink-primary",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            title="Скоро"
            aria-label="Поиск — скоро"
            disabled
            className="text-ink-secondary"
          >
            <IconSearch size={18} stroke={1.5} aria-hidden />
          </Button>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-night-600 text-xs font-medium text-ink-primary"
              aria-label="Меню пользователя"
              aria-expanded={menuOpen}
              onClick={() => {
                setMenuOpen((open) => !open);
              }}
            >
              {initials}
            </button>

            {menuOpen ? (
              <div className="absolute right-0 mt-2 min-w-[180px] rounded-control border border-line bg-night-800 p-1 shadow-float">
                <p className="truncate px-3 py-2 text-xs text-ink-secondary">
                  {displayName}
                </p>
                <Link
                  href="/settings"
                  className="block rounded-control px-3 py-2 text-sm text-ink-primary hover:bg-night-700"
                  onClick={() => {
                    setMenuOpen(false);
                  }}
                >
                  Настройки
                </Link>
                <div className="my-1 border-t border-line-subtle" />
                <button
                  type="button"
                  className="w-full rounded-control px-3 py-2 text-left text-sm text-ink-primary hover:bg-night-700"
                  onClick={() => void handleSignOut()}
                >
                  Выйти
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
