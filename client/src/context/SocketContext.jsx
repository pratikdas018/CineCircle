import { createContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

export const SocketContext = createContext();

export const SocketProvider = ({ children, user }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) {
      setSocket(null);
      return;
    }

    const socketBaseUrl =
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      "http://localhost:5000";

    const newSocket = io(socketBaseUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
    setSocket(newSocket);

    newSocket.emit("addUser", user._id);

    return () => {
      newSocket.close();
      setSocket(null);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
