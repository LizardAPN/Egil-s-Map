import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const form = new FormData();
        form.append("username", credentials.username);
        form.append("password", credentials.password);
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          body: form,
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
          id: "user",
          name: credentials.username,
          email: null,
          accessToken: data.access_token,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.accessToken = (user as { accessToken?: string }).accessToken;
        token.email = (user as { email?: string }).email;
        token.name = (user as { name?: string }).name;
      }
      // OAuth: fetch backend token on sign-in or retry if missing (e.g. prior oauth-sync failed)
      const needsOAuthSync =
        (user && account?.provider !== "credentials") || (!token.accessToken && (token.email || token.name));
      if (needsOAuthSync && !token.accessToken && (token.email || token.name)) {
        try {
          const res = await fetch(`${API_BASE}/auth/oauth-sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: token.email,
              name: token.name,
              provider: account?.provider || "google",
            }),
          });
          if (res.ok) {
            const data = await res.json();
            token.accessToken = data.access_token;
          } else {
            const errText = await res.text().catch(() => "");
            console.error("oauth-sync failed:", res.status, errText);
          }
        } catch (e) {
          console.error("oauth-sync request failed:", e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      (session as { accessToken?: string }).accessToken = token.accessToken as string;
      return session;
    },
  },
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
};
