import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import api from "../services/api";
import { AuthContext } from "./AuthContext";
import { SocketContext } from "./SocketContext";

// eslint-disable-next-line react-refresh/only-export-components
export const NotificationContext = createContext();

const SOUND_CANDIDATES = {
  like: ["/like.mp3", "/notification-like.mp3", "/notification.mp3"],
  comment: ["/comment.mp3", "/notification-comment.mp3", "/post.mp3", "/notification.mp3"],
  mention: ["/mention.mp3", "/notification-mention.mp3", "/receive.mp3", "/notification.mp3"],
  default: ["/notification.mp3"],
};

const UNREAD_POLL_INTERVAL_MS = 60_000;
const UNREAD_REQUEST_TIMEOUT_MS = 10_000;

const playSound = async (sources) => {
  for (const source of sources) {
    try {
      const audio = new Audio(source);
      audio.volume = 0.9;
      await audio.play();
      return;
    } catch {
      // Try next candidate source.
    }
  }
};

export const NotificationProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState(null);
  const latestNotificationIdRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return 0;

    try {
      const res = await api.get("/api/notifications/unread-count", {
        timeout: UNREAD_REQUEST_TIMEOUT_MS,
      });

      const countValue = Number(res.data?.count ?? res.data?.unreadCount ?? 0);
      if (!Number.isFinite(countValue)) return 0;
      return Math.max(0, countValue);
    } catch (error) {
      console.error("Failed to fetch unread count", error);
      return null;
    }
  }, [user]);

  const refetchUnreadCount = useCallback(async () => {
    const nextUnreadCount = await fetchUnreadCount();
    if (!Number.isFinite(nextUnreadCount)) return null;
    setUnreadCount(Math.max(0, nextUnreadCount));
    return nextUnreadCount;
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setLatestNotification(null);
      latestNotificationIdRef.current = null;
      return;
    }

    void refetchUnreadCount();
  }, [user, refetchUnreadCount]);

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      void refetchUnreadCount();
    }, UNREAD_POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [user, refetchUnreadCount]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleRealtimeNotification = async (payload) => {
      const notification = payload?.notification || null;
      const unread = Number(payload?.unreadCount);

      if (notification?._id && latestNotificationIdRef.current !== notification._id) {
        latestNotificationIdRef.current = notification._id;
        setLatestNotification(notification);
      }

      if (Number.isFinite(unread)) {
        setUnreadCount(Math.max(0, unread));
      } else if (notification?._id) {
        setUnreadCount((prev) => prev + 1);
      }

      if (notification?._id) {
        const sources = SOUND_CANDIDATES[notification.type] || SOUND_CANDIDATES.default;
        await playSound(sources);
      }
    };

    const handleLegacyNotification = async (payload) => {
      setUnreadCount((prev) => prev + 1);
      const sources = SOUND_CANDIDATES[payload?.type] || SOUND_CANDIDATES.default;
      await playSound(sources);
      void refetchUnreadCount();
    };

    const handleUnreadCountSync = (payload) => {
      const value = Number(payload?.unreadCount);
      if (Number.isFinite(value)) {
        setUnreadCount(Math.max(0, value));
      }
    };

    const handleSocketConnected = () => {
      void refetchUnreadCount();
    };

    socket.on("connect", handleSocketConnected);
    socket.on("notification:new", handleRealtimeNotification);
    socket.on("getNotification", handleLegacyNotification);
    socket.on("notification:unread-count", handleUnreadCountSync);

    return () => {
      socket.off("connect", handleSocketConnected);
      socket.off("notification:new", handleRealtimeNotification);
      socket.off("getNotification", handleLegacyNotification);
      socket.off("notification:unread-count", handleUnreadCountSync);
    };
  }, [socket, user, refetchUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        setUnreadCount,
        latestNotification,
        setLatestNotification,
        refetchUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
