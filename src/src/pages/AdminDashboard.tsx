
import { useEffect, useState } from "react";
import { api } from "../lib/api";

type DashboardStats = {
  totalUsers: number;
  totalTransactions: number;
  totalSwaps: number;
  totalRevenueUsd: number;
  activeUsers: number;
};

type Activity = {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  status: string;
};

type Announcement = {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "promotion";
  active: boolean;
};

const emptyStats: DashboardStats = {
  totalUsers: 0,
  totalTransactions: 0,
  totalSwaps: 0,
  totalRevenueUsd: 0,
  activeUsers: 0,
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [announcementType, setAnnouncementType] =
    useState<Announcement["type"]>("info");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [statsData, activityData, announcementData] =
        await Promise.all([
          api.get<DashboardStats>("/api/admin/dashboard/stats"),
          api.get<Activity[]>("/api/admin/dashboard/activity"),
          api.get<Announcement[]>("/api/admin/announcements"),
        ]);

      setStats(statsData);
      setActivities(activityData);
      setAnnouncements(announcementData);
    } catch {
      setError(
        "Ba a iya ɗauko bayanan dashboard ba. Tabbatar cewa Admin ya shiga kuma backend yana aiki."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function createAnnouncement(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!title.trim() || !message.trim()) return;

    setSaving(true);
    setError("");

    try {
      await api.post("/api/admin/announcements", {
        title: title.trim(),
        message: message.trim(),
        type: announcementType,
        active: true,
      });

      setTitle("");
      setMessage("");
      setAnnouncementType("info");
      setShowAnnouncementForm(false);

      await loadDashboard();
    } catch {
      setError("An kasa ƙirƙirar sanarwar. Gwada kuma.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAnnouncement(item: Announcement) {
    setError("");

    try {
      await api.put(
        `/api/admin/announcements/${encodeURIComponent(item.id)}`,
        { active: !item.active }
      );

      await loadDashboard();
    } catch {
      setError("An kasa canza matsayin sanarwar.");
    }
  }

  async function deleteAnnouncement(id: string) {
    const confirmed = window.confirm(
      "Kana son goge wannan sanarwar?"
    );

    if (!confirmed) return;

    setError("");

    try {
      await api.delete(
        `/api/admin/announcements/${encodeURIComponent(id)}`
      );

      await loadDashboard();
    } catch {
      setError("An kasa goge sanarwar.");
    }
  }

  async function logout() {
    try {
      await api.post("/api/admin/auth/logout", {});
    } finally {
      window.location.href = "/admin/login";
    }
  }

  const cards = [
    {
      label: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      icon: "♙",
    },
    {
      label: "Active Users",
      value: stats.activeUsers.toLocaleString(),
      icon: "◉",
    },
    {
      label: "Transactions",
      value: stats.totalTransactions.toLocaleString(),
      icon: "⇄",
    },
    {
      label: "Total Swaps",
      value: stats.totalSwaps.toLocaleString(),
      icon: "⇆",
    },
    {
      label: "Revenue",
      value: `$${stats.totalRevenueUsd.toFixed(2)}`,
      icon: "$",
    },
  ];

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <header className="sticky top-0 z-20 border-b border-[#c9a64b]/20 bg-[#0d0d0d] px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">
              YALO <span className="text-[#d6b65d]">ADMIN</span>
            </h1>
            <p className="text-xs text-gray-500">
              Wallet Management Dashboard
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Overview</h2>
            <p className="mt-1 text-sm text-gray-400">
              Monitor your wallet platform operations.
            </p>
          </div>

          <button
            onClick={() => void loadDashboard()}
            disabled={loading}
            className="rounded-lg border border-[#c9a64b]/40 px-4 py-2 text-sm text-[#d6b65d] hover:bg-[#c9a64b]/10 disabled:opacity-50"
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-white/10 bg-[#111] p-8 text-center text-gray-400">
            Loading dashboard data...
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-[#c9a64b]/15 bg-[#111] p-5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">
                    {card.label}
                  </p>
                  <span className="text-xl text-[#d6b65d]">
                    {card.icon}
                  </span>
                </div>

                <p className="mt-4 text-2xl font-bold">
                  {card.value}
                </p>
              </div>
            ))}
          </section>
        )}

        <section className="rounded-2xl border border-white/10 bg-[#111] p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">
                Recent Activity
              </h3>
              <p className="text-xs text-gray-500">
                Latest recorded platform events
              </p>
            </div>
          </div>

          {activities.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              No activity records available.
            </p>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {activity.description}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {activity.type} ·{" "}
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300">
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#c9a64b]/20 bg-[#111] p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">
                Announcements & Promotions
              </h3>
              <p className="text-xs text-gray-500">
                Manage messages displayed to wallet users.
              </p>
            </div>

            <button
              onClick={() =>
                setShowAnnouncementForm(!showAnnouncementForm)
              }
              className="rounded-lg bg-[#c9a64b] px-4 py-2 text-sm font-semibold text-black hover:bg-[#dfc16e]"
            >
              {showAnnouncementForm ? "Close" : "+ New Announcement"}
            </button>
          </div>

          {showAnnouncementForm && (
            <form
              onSubmit={createAnnouncement}
              className="mb-6 space-y-4 rounded-xl border border-white/10 bg-[#080808] p-4"
            >
              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Title
                </label>
                <input
                  required
                  maxLength={100}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#111] px-4 py-3 outline-none focus:border-[#c9a64b]"
                  placeholder="Announcement title"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Message
                </label>
                <textarea
                  required
                  maxLength={1000}
                  rows={4}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#111] px-4 py-3 outline-none focus:border-[#c9a64b]"
                  placeholder="Write your announcement..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Announcement Type
                </label>
                <select
                  value={announcementType}
                  onChange={(event) =>
                    setAnnouncementType(
                      event.target.value as Announcement["type"]
                    )
                  }
                  className="w-full rounded-lg border border-white/10 bg-[#111] px-4 py-3 outline-none focus:border-[#c9a64b]"
                >
                  <option value="info">Information</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="promotion">Promotion</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[#c9a64b] px-5 py-3 font-semibold text-black disabled:opacity-50"
              >
                {saving ? "Saving..." : "Publish Announcement"}
              </button>
            </form>
          )}

          {announcements.length === 0 ? (
            <p className="py-5 text-center text-sm text-gray-500">
              No announcements available.
            </p>
          ) : (
            <div className="space-y-3">
              {announcements.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-[#080808] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold">{item.title}</h4>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-400">
                        {item.message}
                      </p>
                      <p className="mt-2 text-xs text-[#d6b65d]">
                        {item.type} ·{" "}
                        {item.active ? "Active" : "Inactive"}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => void toggleAnnouncement(item)}
                        className="rounded-lg border border-[#c9a64b]/30 px-3 py-2 text-xs text-[#d6b65d]"
                      >
                        {item.active ? "Disable" : "Enable"}
                      </button>

                      <button
                        onClick={() => void deleteAnnouncement(item.id)}
                        className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="border-t border-white/10 py-5 text-center text-xs text-gray-600">
          YALO Wallet · Secure Administration
        </footer>
      </div>
    </main>
  );
}
