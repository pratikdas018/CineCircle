import { createContext, useEffect, useMemo } from "react";
import { io } from "socket.io-client";

// eslint-disable-next-line react-refresh/only-export-components
export const SocketContext = createContext();

export const SocketProvider = ({ children, user }) => {
  const token = user?.token || "";

  const socket = useMemo(() => {
    if (!token) {
      return null;
    }

    const socketBaseUrl =
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      "http://localhost:5000";

    return io(socketBaseUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: {
        token: `Bearer ${token}`,
      },
    });
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    socket.emit("addUser");
    return () => {
      socket.close();
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
