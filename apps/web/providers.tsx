"use client";

import { createSupabaseBrowserClient } from "@imprint/api/browser";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";

if (typeof window !== "undefined") {
  createSupabaseBrowserClient();
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000
    }
  }
});

export function Providers({ children }: { children: React.ReactNode }) {
  createSupabaseBrowserClient();

  useEffect(() => {
    const client = createSupabaseBrowserClient();

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <>{children}</>
    </QueryClientProvider>
  );
}
