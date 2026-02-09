"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Report {
  id: number;
  reporter_id: number;
  reporter_username: string;
  reported_user_id: number | null;
  reported_user_username: string | null;
  reported_pin_id: number | null;
  reason: string;
  status: string;
  created_at: string;
}

interface User {
  id: number;
  username: string;
  email: string | null;
  role: string;
  is_shadow_banned: boolean;
  is_muted: boolean;
  total_inspiration_score: number;
  created_at: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [starMapVisible, setStarMapVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const token = (session as { accessToken?: string })?.accessToken;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && token) {
      // Check if user is admin
      checkAdminAccess();
    }
  }, [status, token, router]);

  async function checkAdminAccess() {
    if (!token) return;
    try {
      // Fetch user profile to check role
      const username = session?.user?.name;
      if (!username) return;
      
      const profile = await apiFetch(`/profile/${encodeURIComponent(username)}`, { token });
      
      if (profile.role !== "ADMIN") {
        setError("Access denied. Admin role required.");
        setLoading(false);
        return;
      }
      
      setUserRole(profile.role);
      await loadData();
    } catch (err) {
      setError("Failed to verify admin access");
      setLoading(false);
    }
  }

  async function loadData() {
    if (!token) return;
    try {
      setLoading(true);
      const [reportsData, usersData, starMapData] = await Promise.all([
        apiFetch("/admin/reports", { token }),
        apiFetch("/admin/users", { token }),
        apiFetch("/admin/settings/star-map", { token }),
      ]);
      
      setReports(reportsData);
      setUsers(usersData);
      setStarMapVisible(starMapData.visible);
    } catch (err) {
      setError("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  async function toggleShadowBan(userId: number) {
    if (!token) return;
    try {
      await apiFetch(`/admin/users/${userId}/shadow-ban`, {
        token,
        method: "POST",
      });
      await loadData();
    } catch (err) {
      alert("Failed to toggle shadow ban");
    }
  }

  async function toggleMute(userId: number) {
    if (!token) return;
    try {
      await apiFetch(`/admin/users/${userId}/mute`, {
        token,
        method: "POST",
      });
      await loadData();
    } catch (err) {
      alert("Failed to toggle mute");
    }
  }

  async function toggleStarMap() {
    if (!token) return;
    try {
      const result = await apiFetch("/admin/settings/star-map", {
        token,
        method: "POST",
      });
      setStarMapVisible(result.visible);
    } catch (err) {
      alert("Failed to toggle star map visibility");
    }
  }

  if (status === "loading" || loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Star Map Toggle */}
      <section className="mb-8 p-4 bg-gray-800 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Global Settings</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={starMapVisible}
              onChange={toggleStarMap}
              className="w-4 h-4"
            />
            <span>Star Map Visible</span>
          </label>
        </div>
      </section>

      {/* Reports Table */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Reports</h2>
        <div className="overflow-x-auto bg-gray-800 rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="p-4 text-left">ID</th>
                <th className="p-4 text-left">Reporter</th>
                <th className="p-4 text-left">Reported User</th>
                <th className="p-4 text-left">Reported Pin</th>
                <th className="p-4 text-left">Reason</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b border-gray-700">
                  <td className="p-4">{report.id}</td>
                  <td className="p-4">{report.reporter_username}</td>
                  <td className="p-4">{report.reported_user_username || "N/A"}</td>
                  <td className="p-4">{report.reported_pin_id || "N/A"}</td>
                  <td className="p-4">{report.reason}</td>
                  <td className="p-4">{report.status}</td>
                  <td className="p-4">{new Date(report.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Users Table */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Users</h2>
        <div className="overflow-x-auto bg-gray-800 rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="p-4 text-left">ID</th>
                <th className="p-4 text-left">Username</th>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">Role</th>
                <th className="p-4 text-left">Score</th>
                <th className="p-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-700">
                  <td className="p-4">{user.id}</td>
                  <td className="p-4">{user.username}</td>
                  <td className="p-4">{user.email || "N/A"}</td>
                  <td className="p-4">{user.role}</td>
                  <td className="p-4">{user.total_inspiration_score}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleShadowBan(user.id)}
                        className={`px-3 py-1 rounded ${
                          user.is_shadow_banned
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-gray-600 hover:bg-gray-700"
                        }`}
                      >
                        {user.is_shadow_banned ? "Unban" : "Shadow Ban"}
                      </button>
                      <button
                        onClick={() => toggleMute(user.id)}
                        className={`px-3 py-1 rounded ${
                          user.is_muted
                            ? "bg-orange-600 hover:bg-orange-700"
                            : "bg-gray-600 hover:bg-gray-700"
                        }`}
                      >
                        {user.is_muted ? "Unmute" : "Mute"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
