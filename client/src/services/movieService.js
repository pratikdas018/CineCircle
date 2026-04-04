import api from "./api";

export const createAlert = async (payload) => {
  const { data } = await api.post("/api/alerts", payload);
  return data;
};

export const getAlerts = async () => {
  const { data } = await api.get("/api/alerts");
  return data;
};

export const removeAlert = async (alertId) => {
  const { data } = await api.delete(`/api/alerts/${alertId}`);
  return data;
};

export const getTrendingMovies = async () => {
  const { data } = await api.get("/api/trending");
  return data;
};
