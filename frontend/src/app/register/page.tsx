"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email: email || undefined, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const errorMessage = err.detail || err.message || `Server error: ${res.status} ${res.statusText}`;
        throw new Error(errorMessage);
      }
      router.push("/login");
    } catch (err: unknown) {
      if (err instanceof TypeError && err.message.includes("Failed to fetch")) {
        setError("Cannot connect to server. Please ensure the backend is running at " + API_BASE);
      } else {
        setError(err instanceof Error ? err.message : "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-[#1a1a1e] border-2 border-[#3a3a3e] rounded-sm shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] p-6">
        <h1 className="text-2xl font-bold mb-6 text-amber-400 font-cinzel">Create Account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1 font-special-elite">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-[#0a0a0c] border border-gray-600 focus:border-[#d4af37] text-white font-special-elite"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1 font-special-elite">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-[#0a0a0c] border border-gray-600 focus:border-[#d4af37] text-white font-special-elite"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1 font-special-elite">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-[#0a0a0c] border border-gray-600 focus:border-[#d4af37] text-white font-special-elite"
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm font-special-elite">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#d4af37] text-gray-900 font-cinzel font-medium hover:bg-[#b8860b] hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Register"}
          </button>
        </form>
        <p className="mt-6 text-gray-400 text-sm font-special-elite">
          Already have an account?{" "}
          <Link href="/login" className="text-amber-400 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}
