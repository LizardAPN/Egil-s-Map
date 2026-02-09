"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Invalid credentials");
        return;
      }
      window.location.href = "/map";
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md torn-paper-clip p-6">
        <h1 className="text-2xl font-bold mb-6 text-amber-400 font-cinzel">Sign In</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1 font-special-elite">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 torn-paper-clip bg-gray-800 border border-gray-600 text-white font-special-elite"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1 font-special-elite">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 torn-paper-clip bg-gray-800 border border-gray-600 text-white font-special-elite"
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm font-special-elite">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 torn-paper-clip bg-amber-500 text-gray-900 font-cinzel font-medium hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <div className="mt-4 flex gap-4 justify-center">
          <button
            onClick={() => signIn("google")}
            className="px-4 py-2 torn-paper-clip bg-gray-800 border border-gray-600 hover:bg-gray-700 font-cinzel"
          >
            Google
          </button>
          <button
            onClick={() => signIn("github")}
            className="px-4 py-2 torn-paper-clip bg-gray-800 border border-gray-600 hover:bg-gray-700 font-cinzel"
          >
            GitHub
          </button>
        </div>
        <p className="mt-6 text-gray-400 text-sm font-special-elite">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-amber-400 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
