import { createContext, useEffect, useState } from "react";
import api from "../services/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const normalizeUser = (data) => {
    if (!data || typeof data !== "object") return null;
    if (typeof data.token !== "string" || !data.token.trim()) return null;

    return {
      ...data,
      token: data.token.trim(),
      role: data.role || "user",
      avatar: data.avatar || "",
    };
  };
  
  const getStoredUser = () => {
    try {
      const raw = localStorage.getItem("sceneit_user") || localStorage.getItem("user");
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      const normalized = normalizeUser(parsed);

      if (!normalized) {
        localStorage.removeItem("sceneit_user");
        localStorage.removeItem("user");
        return null;
      }

      localStorage.setItem("sceneit_user", JSON.stringify(normalized));
      localStorage.removeItem("user");
      return normalized;
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem("sceneit_user");
      localStorage.removeItem("user");
      return null;
    }
  };

  const [user, setUser] = useState(() => getStoredUser());

  const login = (data) => {
    const normalized = normalizeUser(data);
    if (!normalized) {
      throw new Error("Invalid authentication response");
    }
    localStorage.setItem("sceneit_user", JSON.stringify(normalized));
    localStorage.removeItem("user");
    setUser(normalized);
  };

  const loginWithGoogle = async (accessToken) => {
    try {
      const res = await api.post("/api/auth/google", { accessToken });
      login(res.data);
    } catch (error) {
      console.error("Google login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("sceneit_user");
    localStorage.removeItem("user");
    setUser(null);
  };

  const updateUser = (data) => {
    const updatedUser = normalizeUser({ ...user, ...data });
    if (!updatedUser) {
      logout();
      return;
    }
    localStorage.setItem("sceneit_user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem("sceneit_user");
      localStorage.removeItem("user");
      setUser(null);
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loginWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};
