"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { isValidToken } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS_BASE = (API_BASE.replace(/^http/, "ws") || "ws://localhost:8000");

type StrongholdDetail = {
  id: number;
  name: string;
  description: string | null;
  avatar_url: string | null;
  is_private: boolean;
  lat: number;
  lng: number;
  brightness: number;
  member_count: number;
  members: { user_id: number; username: string; role: string }[];
  media: { id: number; media_url: string; media_type: string; created_at: string | null }[];
  my_role: string | null;
  created_at: string | null;
};

type JoinRequest = { id: number; user_id: number; username: string; created_at: string | null };
type ChatMessage = { id: number; user_id: number; username: string; content: string; created_at: string | null };

export default function CitadelPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;

  const [detail, setDetail] = useState<StrongholdDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [joinStatus, setJoinStatus] = useState<"idle" | "joining" | "requesting" | "joined" | "requested">("idle");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editManifesto, setEditManifesto] = useState("");
  const [editPrivate, setEditPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDetail = useCallback(() => {
    const headers: HeadersInit = isValidToken(token) ? { Authorization: `Bearer ${token}` } : {};
    fetch(`${API_BASE}/strongholds/${id}`, { headers })
      .then((r) => {
        if (!r.ok) {
          console.error(`Failed to fetch stronghold ${id}:`, r.status, r.statusText);
          throw new Error(`Not found: ${r.status}`);
        }
        return r.json();
      })
      .then(setDetail)
      .catch((err) => {
        console.error("Error fetching stronghold:", err);
        setDetail(null);
      })
      .finally(() => setLoading(false));
  }, [id, token]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    if (!detail) return;
    setEditManifesto(detail.description || "");
    setEditPrivate(detail.is_private);
  }, [detail?.id, detail?.description, detail?.is_private]);

  // Fetch messages (members only)
  useEffect(() => {
    if (!detail?.my_role || !isValidToken(token)) return;
    fetch(`${API_BASE}/strongholds/${id}/messages?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((d) => setMessages(d.messages || []))
      .catch(() => setMessages([]));
  }, [id, detail?.my_role, token]);

  // WebSocket for chat
  useEffect(() => {
    if (!detail?.my_role || !isValidToken(token)) return;
    const wsUrl = `${WS_BASE}/strongholds/${id}/chat?token=${encodeURIComponent(token!)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const m = JSON.parse(e.data) as ChatMessage;
        setMessages((prev) => [...prev, m]);
      } catch {
        // ignore
      }
    };
    ws.onclose = () => {
      wsRef.current = null;
    };
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [id, detail?.my_role, token]);

  // Scroll to bottom when new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch join requests (leaders/officers only)
  useEffect(() => {
    if (!detail?.my_role || !["LEADER", "OFFICER"].includes(detail.my_role) || !isValidToken(token)) return;
    fetch(`${API_BASE}/strongholds/${id}/join-requests`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : { requests: [] }))
      .then((d) => setJoinRequests(d.requests || []))
      .catch(() => setJoinRequests([]));
  }, [id, detail?.my_role, token]);

  const handleJoin = async () => {
    if (!isValidToken(token)) return;
    setJoinStatus("joining");
    try {
      const res = await fetch(`${API_BASE}/strongholds/${id}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setJoinStatus("joined");
        fetchDetail();
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = err.detail || "Could not join";
        if (typeof msg === "string" && msg.includes("request-entry")) {
          setJoinStatus("idle");
          handleRequestEntry();
          return;
        }
        alert(msg);
        setJoinStatus("idle");
      }
    } catch {
      setJoinStatus("idle");
      alert("Failed to join");
    }
  };

  const handleRequestEntry = async () => {
    if (!isValidToken(token)) return;
    setJoinStatus("requesting");
    try {
      const res = await fetch(`${API_BASE}/strongholds/${id}/request-entry`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.status === "requested" || data.status === "already_requested")) {
        setJoinStatus("requested");
      } else {
        alert(data.detail || "Failed to request entry");
        setJoinStatus("idle");
      }
    } catch {
      setJoinStatus("idle");
      alert("Failed to request entry");
    }
  };

  const handleApprove = async (reqId: number) => {
    if (!isValidToken(token)) return;
    const res = await fetch(`${API_BASE}/strongholds/${id}/join-requests/${reqId}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setJoinRequests((prev) => prev.filter((r) => r.id !== reqId));
      fetchDetail();
    }
  };

  const handleReject = async (reqId: number) => {
    if (!isValidToken(token)) return;
    const res = await fetch(`${API_BASE}/strongholds/${id}/join-requests/${reqId}/reject`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setJoinRequests((prev) => prev.filter((r) => r.id !== reqId));
  };

  const handleSendMessage = () => {
    const content = messageInput.trim();
    if (!content || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ content }));
    setMessageInput("");
  };

  const handleSaveSettings = async () => {
    if (!isValidToken(token) || !detail) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/strongholds/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: editManifesto || null,
          is_private: editPrivate,
        }),
      });
      if (res.ok) {
        setDetail((prev) =>
          prev
            ? { ...prev, description: editManifesto || null, is_private: editPrivate }
            : null
        );
        setSettingsOpen(false);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Failed to save");
      }
    } catch {
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isValidToken(token)) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/strongholds/${id}/media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        fetchDetail();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Upload failed");
      }
    } catch {
      alert("Upload failed");
    }
    e.target.value = "";
  };

  if (loading) {
    return (
      <main className="min-h-screen citadel-bg flex items-center justify-center">
        <p className="text-gray-400 font-special-elite">Loading citadel...</p>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="min-h-screen citadel-bg p-8">
        <p className="text-gray-400 font-special-elite">Stronghold not found.</p>
        <Link href="/strongholds" className="text-amber-400 hover:underline mt-4 inline-block font-cinzel">
          Back to Strongholds
        </Link>
      </main>
    );
  }

  const isLeaderOrOfficer = detail.my_role && ["LEADER", "OFFICER"].includes(detail.my_role);
  const isMember = !!detail.my_role;
  const showJoinButton = session && !isMember && !detail.is_private;
  const showRequestButton = session && !isMember && detail.is_private && joinStatus !== "requested";

  return (
    <main className="min-h-screen citadel-bg">
      <header className="flex items-center justify-between p-4 bg-gray-900/50 backdrop-blur-md border-b border-amber-900/30">
        <div className="flex items-center gap-4">
          <Link href="/strongholds" className="text-amber-400 hover:underline font-cinzel">
            ← Back
          </Link>
          <Link href="/" className="text-xl font-bold text-amber-400 font-cinzel uppercase">
            Egil&apos;s Map
          </Link>
        </div>
        <nav className="flex gap-4 font-cinzel uppercase">
          <Link href="/map">Map</Link>
          <Link href="/strongholds" className="text-amber-400">
            Strongholds
          </Link>
          {session ? (
            <>
              <Link href="/profile">Profile</Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-inherit hover:underline bg-transparent border-none cursor-pointer p-0 font-inherit"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link href="/login">Sign In</Link>
          )}
        </nav>
      </header>

      <div className="max-w-5xl mx-auto p-8">
        {/* Header: Name, Avatar, Brightness */}
        <div className="flex flex-wrap items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            {detail.avatar_url ? (
              <img
                src={detail.avatar_url}
                alt="Seal"
                className="w-16 h-16 rounded-full object-cover border-2 border-amber-700"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-amber-900/50 border-2 border-amber-700 flex items-center justify-center font-cinzel text-amber-500 text-xl">
                {detail.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold font-cinzel text-amber-400">{detail.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-400 font-special-elite">Brightness:</span>
                <span className="text-amber-300 font-cinzel font-medium">{detail.brightness}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 ml-auto">
            {showJoinButton && (
              <button
                onClick={handleJoin}
                disabled={joinStatus === "joining"}
                className="px-4 py-2 bg-[#d4af37] text-gray-900 hover:bg-[#b8860b] font-cinzel disabled:opacity-50"
              >
                {joinStatus === "joining" ? "Joining..." : "Join the Order"}
              </button>
            )}
            {showRequestButton && (
              <button
                onClick={handleRequestEntry}
                disabled={joinStatus === "requesting"}
                className="px-4 py-2 bg-[#d4af37] text-gray-900 hover:bg-[#b8860b] font-cinzel disabled:opacity-50"
              >
                {joinStatus === "requesting" ? "Requesting..." : "Request Entry"}
              </button>
            )}
            {joinStatus === "requested" && (
              <span className="px-4 py-2 text-gray-400 font-special-elite">Request sent</span>
            )}
            {isLeaderOrOfficer && (
              <button
                onClick={() => setSettingsOpen(true)}
                className="px-4 py-2 bg-gray-700 text-gray-300 hover:bg-gray-600 font-cinzel"
              >
                Settings
              </button>
            )}
          </div>
        </div>

        {/* Manifesto */}
        <section className="mb-8 p-6 parchment-container">
          <h2 className="text-lg font-cinzel text-amber-400 mb-3">Manifesto</h2>
          <p className="font-cinzel text-gray-300 whitespace-pre-wrap">
            {detail.description || "No manifesto yet."}
          </p>
        </section>

        {/* Members */}
        <section className="mb-8">
          <h2 className="text-lg font-cinzel text-amber-400 mb-3">Members ({detail.member_count})</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
            {detail.members.map((m) => (
              <Link
                key={m.user_id}
                href={`/profile/${encodeURIComponent(m.username)}`}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-12 h-12 rounded-full bg-amber-900/50 border-2 border-amber-700 flex items-center justify-center font-cinzel text-amber-400 text-sm group-hover:border-amber-500 transition-colors">
                  {m.username.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs text-gray-400 font-special-elite truncate max-w-full">
                  {m.username}
                </span>
                {m.role === "LEADER" && (
                  <span className="text-[10px] text-amber-500 font-cinzel">Leader</span>
                )}
              </Link>
            ))}
          </div>
        </section>

        {/* Gallery */}
        <section className="mb-8">
          <h2 className="text-lg font-cinzel text-amber-400 mb-3">Artifacts</h2>
          {isMember && (
            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleUploadMedia}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-700 text-gray-300 hover:bg-gray-600 font-cinzel text-sm"
              >
                Upload Photo or Video
              </button>
            </div>
          )}
          <div
            className="columns-2 sm:columns-3 gap-4"
            style={{ columnFill: "balance" }}
          >
            {detail.media.map((m) => (
              <div key={m.id} className="break-inside-avoid mb-4">
                {m.media_type === "photo" ? (
                  <img
                    src={m.media_url}
                    alt="Artifact"
                    className="w-full rounded border border-amber-900/50"
                    loading="lazy"
                  />
                ) : (
                  <video
                    src={m.media_url}
                    controls
                    className="w-full rounded border border-amber-900/50"
                  />
                )}
              </div>
            ))}
          </div>
          {detail.media.length === 0 && (
            <p className="text-gray-500 font-special-elite text-sm">No artifacts yet.</p>
          )}
        </section>

        {/* Council Chat */}
        {isMember && (
          <section className="mb-8 p-6 parchment-container">
            <h2 className="text-lg font-cinzel text-amber-400 mb-3">Council Chat</h2>
            <div
              className="h-64 overflow-y-auto mb-4 font-special-elite text-sm space-y-2"
              style={{ fontFamily: "'Special Elite', monospace" }}
            >
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-2">
                  <span className="text-amber-500 shrink-0">{msg.username}:</span>
                  <span className="text-gray-300 break-words">{msg.content}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-[#0a0a0c] border border-gray-600 focus:border-[#d4af37] font-special-elite"
              />
              <button
                onClick={handleSendMessage}
                className="px-4 py-2 bg-[#d4af37] text-gray-900 hover:bg-[#b8860b] font-cinzel"
              >
                Send
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#1a1a1e] border-2 border-[#3a3a3e] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-cinzel text-amber-400 mb-4">Stronghold Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1 font-special-elite">Manifesto</label>
                <textarea
                  value={editManifesto}
                  onChange={(e) => setEditManifesto(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-[#0a0a0c] border border-gray-600 focus:border-[#d4af37] font-cinzel text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_private"
                  checked={editPrivate}
                  onChange={(e) => setEditPrivate(e.target.checked)}
                />
                <label htmlFor="is_private" className="font-special-elite text-sm">
                  Private (require approval to join)
                </label>
              </div>
              {joinRequests.length > 0 && (
                <div>
                  <h4 className="text-sm font-cinzel text-amber-400 mb-2">Pending Join Requests</h4>
                  <ul className="space-y-2">
                    {joinRequests.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between p-2 bg-[#0a0a0c] rounded"
                      >
                        <span className="font-special-elite text-sm">{r.username}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(r.id)}
                            className="px-2 py-1 bg-green-800 text-green-200 text-xs font-cinzel"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(r.id)}
                            className="px-2 py-1 bg-red-900 text-red-200 text-xs font-cinzel"
                          >
                            Reject
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setSettingsOpen(false)}
                className="flex-1 py-2 bg-gray-700 text-gray-300 font-cinzel"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex-1 py-2 bg-[#d4af37] text-gray-900 hover:bg-[#b8860b] font-cinzel disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
