import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "promotion";
  link?: string;
  linkText?: string;
}

const TYPE_STYLES = {
  info: {
    container: "border-blue-500/30 bg-blue-500/10",
    icon: "ℹ",
    iconColor: "text-blue-400"
  },
  success: {
    container: "border-green-500/30 bg-green-500/10",
    icon: "✓",
    iconColor: "text-green-400"
  },
  warning: {
    container: "border-yellow-500/30 bg-yellow-500/10",
    icon: "!",
    iconColor: "text-yellow-400"
  },
  promotion: {
    container: "border-[#D4AF37]/30 bg-[#D4AF37]/10",
    icon: "✦",
    iconColor: "text-[#D4AF37]"
  }
};

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<
    Announcement[]
  >([]);

  const [dismissed, setDismissed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadAnnouncements() {
      try {
        const response = await api.get<{
          announcements: Announcement[];
        }>("/api/announcements");

        if (active) {
          setAnnouncements(
            Array.isArray(response.announcements)
              ? response.announcements
              : []
          );
        }
      } catch {
        if (active) {
          setAnnouncements([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAnnouncements();

    return () => {
      active = false;
    };
  }, []);

  function dismissAnnouncement(id: string) {
    setDismissed((current) => [...current, id]);
  }

  if (loading || announcements.length === 0) {
    return null;
  }

  const visibleAnnouncements = announcements.filter(
    (announcement) =>
      !dismissed.includes(announcement.id)
  );

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-3 mb-5">
      {visibleAnnouncements.map((announcement) => {
        const style =
          TYPE_STYLES[announcement.type] ??
          TYPE_STYLES.info;

        return (
          <div
            key={announcement.id}
            className={`relative flex items-start gap-3 rounded-xl border p-4 ${style.container}`}
          >
            <span
              className={`text-xl font-bold ${style.iconColor}`}
            >
              {style.icon}
            </span>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-white">
                {announcement.title}
              </h3>

              <p className="mt-1 text-sm leading-6 text-gray-300">
                {announcement.message}
              </p>

              {announcement.link && (
                <a
                  href={announcement.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-sm font-semibold text-[#D4AF37] hover:underline"
                >
                  {announcement.linkText || "Learn more"}
                </a>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                dismissAnnouncement(announcement.id)
              }
              aria-label="Dismiss announcement"
              className="text-gray-400 hover:text-white text-lg"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
  }

