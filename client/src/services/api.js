import axios from "axios";

const normalizeBaseUrl = (value = "") => String(value || "").trim().replace(/\/+$/, "");

const resolveApiBaseUrl = () => {
  const fromEnv = normalizeBaseUrl(import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL);
  if (fromEnv) return fromEnv;

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "http://localhost:5000";
};

const resolveTimeoutMs = () => {
  const raw = Number(import.meta.env.VITE_API_TIMEOUT_MS);
  if (!Number.isFinite(raw) || raw <= 0) return 15_000;
  return Math.min(Math.max(raw, 3_000), 60_000);
};

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  timeout: resolveTimeoutMs(),
});

const getStoredAuthToken = () => {
  const storedUser = localStorage.getItem("sceneit_user") || localStorage.getItem("user");
  if (!storedUser) return null;

  try {
    const parsed = JSON.parse(storedUser);
    if (typeof parsed === "string" && parsed.trim()) {
      return parsed.trim();
    }
    if (parsed && typeof parsed === "object" && typeof parsed.token === "string" && parsed.token.trim()) {
      return parsed.token.trim();
    }
    return null;
  } catch {
    return typeof storedUser === "string" && storedUser.trim() ? storedUser.trim() : null;
  }
};

api.interceptors.request.use((config) => {
  const token = getStoredAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const hadAuthHeader = Boolean(error?.config?.headers?.Authorization);
    const isUnverifiedLoginResponse =
      error?.config?.url?.includes("/api/auth/login") &&
      error?.response?.data?.isUnverified;

    if (status === 401 && hadAuthHeader && !isUnverifiedLoginResponse) {
      localStorage.removeItem("sceneit_user");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth:unauthorized"));
    }

    return Promise.reject(error);
  }
);

export default api;
