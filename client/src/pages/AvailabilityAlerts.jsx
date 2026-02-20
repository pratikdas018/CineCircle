import { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { toast } from "react-hot-toast";
import PageTransition from "../components/layout/PageTransition";

const AvailabilityAlerts = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data } = await api.get("/api/availability-alerts");
      setAlerts(data || []);
    } catch {
      toast.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchAlerts();
  }, [user, navigate, fetchAlerts]);

  const deleteAlert = async (id) => {
    try {
      await api.delete(`/api/availability-alerts/${id}`);
      setAlerts((prev) => prev.filter((alert) => alert._id !== id));
      toast.success("Alert removed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove alert");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen w-full overflow-x-hidden bg-transparent px-3 py-4 text-slate-900 transition-colors duration-500 dark:text-slate-100 sm:px-5 md:px-8 md:py-8 lg:px-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 border-l-4 border-indigo-500 pl-4">
            OTT Availability Alerts
          </h1>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert._id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <Link to={`/movie/${alert.movieId}`} className="font-bold hover:underline">
                    {alert.movieTitle}
                  </Link>
                  <p className="break-words text-sm text-slate-500">
                    Platform: {alert.providerName} • Region: {alert.region}
                  </p>
                  <p className="text-xs mt-1">
                    Status:{" "}
                    <span
                      className={`font-semibold ${
                        alert.notified
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {alert.notified ? "Notified" : "Watching"}
                    </span>
                    {alert.lastCheckedAt
                      ? ` • Last checked ${new Date(alert.lastCheckedAt).toLocaleString()}`
                      : ""}
                  </p>
                </div>
                <button
                  onClick={() => deleteAlert(alert._id)}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-sm px-3 py-2 rounded-lg"
                >
                  Remove Alert
                </button>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-500">
                No alerts yet. Open a movie page, then use the "Alert me" button under streaming providers.
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default AvailabilityAlerts;
