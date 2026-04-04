import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import api from "../services/api";
import { NotificationContext } from "../context/NotificationContext";

const NOTIFICATION_FETCH_TIMEOUT_MS = 12_000;

const normalizeBaseUrl = (value = "") => String(value || "").trim().replace(/\/+$/, "");

const resolveAvatarBaseUrl = () =>
  normalizeBaseUrl(import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "");

const getMovieIdFromNotification = (notification) => {
  const review = notification?.reviewId;
  if (!review) return "";
  if (typeof review === "string") return review;
  return String(review.movieId || "").trim();
};

const Notifications = () => {
  const { setUnreadCount, latestNotification, refetchUnreadCount } = useContext(NotificationContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [pendingReadIds, setPendingReadIds] = useState(() => new Set());

  const avatarBaseUrl = useMemo(() => resolveAvatarBaseUrl(), []);

  const toAvatarSrc = useCallback(
    (avatar = "") => {
      const value = String(avatar || "").trim();
      if (!value) return "";
      if (value.startsWith("http") || value.startsWith("data:")) return value;
      if (!avatarBaseUrl) return value;
      return `${avatarBaseUrl}${value.startsWith("/") ? "" : "/"}${value}`;
    },
    [avatarBaseUrl]
  );

  const fetchNotifications = useCallback(
    async (pageNum, isLoadMore = false) => {
      if (isLoadMore) setLoadingMore(true);
      else {
        setLoading(true);
        setError("");
      }

      try {
        const res = await api.get(`/api/notifications?page=${pageNum}&limit=10`, {
          timeout: NOTIFICATION_FETCH_TIMEOUT_MS,
        });

        const incomingNotifications = Array.isArray(res.data?.notifications)
          ? res.data.notifications
          : [];

        setNotifications((prev) => {
          if (!isLoadMore) return incomingNotifications;

          const byId = new Map(prev.map((item) => [item._id, item]));
          incomingNotifications.forEach((item) => {
            byId.set(item._id, item);
          });
          return [...byId.values()];
        });

        setHasMore(Boolean(res.data?.hasMore));
        if (pageNum === 1) {
          void refetchUnreadCount();
        }
      } catch (err) {
        console.error("Failed to fetch notifications", err);
        if (!isLoadMore) {
          setError("Failed to load notifications. Please try again.");
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [refetchUnreadCount]
  );

  useEffect(() => {
    void fetchNotifications(1);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!latestNotification?._id) return;

    setNotifications((prev) => {
      const exists = prev.some((item) => item._id === latestNotification._id);
      if (exists) return prev;
      return [latestNotification, ...prev];
    });
  }, [latestNotification]);

  const markAsRead = useCallback(
    async (id) => {
      const notification = notifications.find((item) => item._id === id);
      if (!notification || notification.read || pendingReadIds.has(id)) return;

      setPendingReadIds((prev) => new Set(prev).add(id));

      try {
        const res = await api.put(`/api/notifications/${id}/read`, null, {
          timeout: NOTIFICATION_FETCH_TIMEOUT_MS,
        });

        setNotifications((prev) => prev.map((item) => (item._id === id ? { ...item, read: true } : item)));

        const unreadCount = Number(res.data?.unreadCount);
        if (Number.isFinite(unreadCount)) {
          setUnreadCount(Math.max(0, unreadCount));
        } else {
          void refetchUnreadCount();
        }
      } catch (err) {
        console.error("Failed to mark notification as read", err);
      } finally {
        setPendingReadIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [notifications, pendingReadIds, refetchUnreadCount, setUnreadCount]
  );

  const markAllAsRead = useCallback(async () => {
    try {
      const res = await api.put("/api/notifications/mark-read", null, {
        timeout: NOTIFICATION_FETCH_TIMEOUT_MS,
      });

      setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));

      const unreadCount = Number(res.data?.unreadCount);
      if (Number.isFinite(unreadCount)) {
        setUnreadCount(Math.max(0, unreadCount));
      } else {
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  }, [setUnreadCount]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    const nextPage = page + 1;
    setPage(nextPage);
    void fetchNotifications(nextPage, true);
  }, [fetchNotifications, hasMore, loadingMore, page]);

  const hasUnread = notifications.some((notification) => !notification.read);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-transparent px-3 py-4 text-slate-900 transition-all duration-500 ease-in-out dark:text-slate-100 sm:px-5 md:px-8 md:py-8 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-6 dark:border-slate-800">
          <h1 className="flex items-center gap-3 text-3xl font-extrabold md:text-4xl">Notifications</h1>
          <div className="flex flex-wrap items-center gap-3">
            {hasUnread && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-bold uppercase tracking-wider text-indigo-600 transition-colors hover:underline dark:text-indigo-400"
              >
                Mark all as read
              </button>
            )}
            {notifications.length > 0 && (
              <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                {notifications.length} Total
              </span>
            )}
          </div>
        </header>

        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-red-500"></div>
            <p className="animate-pulse text-gray-500">Loading your activity...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-slate-200/20 py-16 text-center dark:border-slate-800 dark:bg-slate-800/20 md:py-24">
            <p className="text-xl font-light text-slate-500 md:text-2xl">Your inbox is empty</p>
            <p className="mt-2 text-slate-400">Interactions from your friends will appear here.</p>
            {error && (
              <button
                onClick={() => void fetchNotifications(1)}
                className="mt-4 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                Retry
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const isUnread = !notification.read;
              const movieId = getMovieIdFromNotification(notification);
              const hasMovieLink = Boolean(movieId);
              const avatarSrc = toAvatarSrc(notification.sender?.avatar || "");

              return (
                <div
                  key={notification._id}
                  onClick={() => {
                    if (isUnread) void markAsRead(notification._id);
                  }}
                  className={`group rounded-2xl border p-5 transition-all duration-300 ${
                    notification.read
                      ? "border-slate-200 bg-white/50 hover:bg-white dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-800/50"
                      : "border-indigo-100 bg-indigo-50/50 shadow-sm hover:shadow-md dark:border-rose-500/20 dark:bg-slate-900 dark:hover:border-rose-500/40"
                  } ${isUnread ? "cursor-pointer" : ""}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-red-500 to-orange-600 text-xl font-bold text-white shadow-lg">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt={notification.sender?.name || "User"}
                            className="h-full w-full object-cover"
                            onError={(event) => {
                              event.target.onerror = null;
                              event.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                notification.sender?.name || "User"
                              )}&background=random`;
                            }}
                          />
                        ) : (
                          (notification.sender?.name || "U").charAt(0).toUpperCase()
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="break-words whitespace-normal leading-relaxed text-slate-600 dark:text-slate-300">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {notification.sender?.name || "A user"}
                        </span>{" "}
                        {notification.type === "like"
                          ? "liked your review for"
                          : notification.type === "mention"
                            ? "mentioned you in a comment on"
                            : "commented on your review for"}{" "}
                        {hasMovieLink ? (
                          <Link
                            to={`/movie/${movieId}`}
                            className="font-bold text-rose-600 transition-colors hover:underline dark:text-rose-500"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (isUnread) void markAsRead(notification._id);
                            }}
                          >
                            {notification.movieTitle || "a movie"}
                          </Link>
                        ) : (
                          <span className="font-bold text-rose-600 dark:text-rose-500">
                            {notification.movieTitle || "a movie"}
                          </span>
                        )}
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                        {pendingReadIds.has(notification._id) && (
                          <span className="text-[10px] text-indigo-500">Updating...</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && hasMore && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="rounded-full border border-slate-200 bg-white px-6 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
