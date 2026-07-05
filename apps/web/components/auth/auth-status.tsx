"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createBrowserClient } from "@imprint/api";
import { Button } from "@imprint/ui";

function getInitials(email: string | undefined): string {
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

export function AuthStatus() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient();

    void supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
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

  if (loading) {
    return null;
  }

  if (!email) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            router.push("/sign-in");
          }}
        >
          Войти
        </Button>
      </div>
    );
  }

  return (
    <div ref={menuRef} className="fixed top-4 right-4 z-50">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-night-600 text-xs font-medium text-ink-primary"
        aria-label="Меню пользователя"
        aria-expanded={menuOpen}
        onClick={() => {
          setMenuOpen((open) => !open);
        }}
      >
        {getInitials(email)}
      </button>

      {menuOpen ? (
        <div className="absolute right-0 mt-2 min-w-[140px] rounded-control border border-line bg-night-800 p-1 shadow-[0_8px_24px_rgb(0_0_0/0.35)]">
          <button
            type="button"
            className="w-full rounded-control px-3 py-2 text-left text-sm text-ink-secondary hover:bg-night-700"
            onClick={() => void handleSignOut()}
          >
            Выйти
          </button>
        </div>
      ) : null}
    </div>
  );
}
