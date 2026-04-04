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
      const res = await api.get("/api/notifications/unread-count");
      return Number(res.data.count || 0);
    } catch (error) {
      console.error("Failed to fetch unread count", error);
      return null;
    }
  }, [user]);

  useEffect(() => {
    let isActive = true;

    const loadUnreadCount = async () => {
      const nextUnreadCount = await fetchUnreadCount();
      if (!isActive || !Number.isFinite(nextUnreadCount)) return;
      setUnreadCount(Math.max(0, nextUnreadCount));
    };

    void loadUnreadCount();

    return () => {
      isActive = false;
    };
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleRealtimeNotification = async (payload) => {
      const notification = payload?.notification || null;
      const unread = payload?.unreadCount;

      if (!notification?._id) {
        return;
      }

      if (latestNotificationIdRef.current === notification._id) {
        return;
      }

      latestNotificationIdRef.current = notification._id;
      setLatestNotification(notification);

      if (typeof unread === "number") {
        setUnreadCount(Math.max(0, unread));
      } else {
        setUnreadCount((prev) => prev + 1);
      }

      const sources = SOUND_CANDIDATES[notification.type] || SOUND_CANDIDATES.default;
      await playSound(sources);
    };

    const handleLegacyNotification = async (payload) => {
      setUnreadCount((prev) => prev + 1);
      const sources = SOUND_CANDIDATES[payload?.type] || SOUND_CANDIDATES.default;
      await playSound(sources);
    };

    const handleUnreadCountSync = (payload) => {
      const value = Number(payload?.unreadCount);
      if (Number.isFinite(value)) {
        setUnreadCount(Math.max(0, value));
      }
    };

    socket.on("notification:new", handleRealtimeNotification);
    socket.on("getNotification", handleLegacyNotification);
    socket.on("notification:unread-count", handleUnreadCountSync);

    return () => {
      socket.off("notification:new", handleRealtimeNotification);
      socket.off("getNotification", handleLegacyNotification);
      socket.off("notification:unread-count", handleUnreadCountSync);
    };
  }, [socket, user]);

  const refetchUnreadCount = useCallback(async () => {
    const nextUnreadCount = await fetchUnreadCount();
    if (!Number.isFinite(nextUnreadCount)) return;
    setUnreadCount(Math.max(0, nextUnreadCount));
  }, [fetchUnreadCount]);

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
