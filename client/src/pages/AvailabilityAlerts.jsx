import { useCallback, useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import PageTransition from "../components/layout/PageTransition";
import { AuthContext } from "../context/AuthContext";
import { getAlerts, getTrendingMovies, removeAlert } from "../services/movieService";

const AvailabilityAlerts = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await getAlerts();
      setAlerts(data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load alerts");
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  const fetchTrending = useCallback(async () => {
    try {
      const data = await getTrendingMovies();
      setTrendingMovies(data || []);
    } catch {
      toast.error("Failed to load new OTT releases");
    } finally {
      setLoadingTrending(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    fetchAlerts();
    fetchTrending();
  }, [user, navigate, fetchAlerts, fetchTrending]);

  const handleDeleteAlert = async (id) => {
    try {
      await removeAlert(id);
      setAlerts((prev) => prev.filter((alert) => alert._id !== id));
      toast.success("Alert removed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove alert");
    }
  };

  const renderAlertStatus = (alert) => {
    if (!alert.isNotified) {
      return <span className="font-semibold text-amber-500">{"\uD83D\uDFE1 Waiting"}</span>;
    }

    return <span className="font-semibold text-emerald-500">{"\uD83D\uDFE2 Available"}</span>;
  };

  return (
    <PageTransition>
      <div className="min-h-screen w-full overflow-x-hidden bg-transparent px-3 py-4 text-slate-900 transition-colors duration-500 dark:text-slate-100 sm:px-5 md:px-8 md:py-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-6 border-l-4 border-indigo-500 pl-4 text-3xl font-bold">
            OTT Availability Alerts
          </h1>

          {loadingAlerts ? (
            <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-900">
              <div className="h-10 w-10 animate-spin rounded-full border-b-4 border-t-4 border-indigo-500"></div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              No alerts yet
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => {
                const availableMessage = alert.availableOn?.length
                  ? `Now available on ${alert.availableOn.join(", ")}`
                  : "";

                return (
                  <div
                    key={alert._id}
                    className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex min-w-0 gap-4">
                      <img
                        src={alert.poster || "https://placehold.co/300x450?text=No+Image"}
                        alt={alert.title}
                        className="h-28 w-20 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                        onError={(e) => {
                          e.target.src = "https://placehold.co/300x450?text=No+Image";
                        }}
                      />

                      <div className="min-w-0">
                        <Link
                          to={`/movie/${alert.imdbID}`}
                          className="line-clamp-2 text-lg font-bold hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          {alert.title}
                        </Link>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {(alert.platforms || []).map((platform) => (
                            <span
                              key={`${alert._id}-${platform}`}
                              className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-300"
                            >
                              {platform}
                            </span>
                          ))}
                        </div>

                        <p className="mt-2 text-sm">{renderAlertStatus(alert)}</p>

                        {alert.isNotified && (
                          <p className="mt-1 text-sm text-emerald-500">
                            {availableMessage || "Now available on selected platform"}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteAlert(alert._id)}
                      className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <section className="mt-10">
            <h2 className="mb-4 border-l-4 border-rose-500 pl-4 text-2xl font-bold">
              New OTT Releases (Movies & Series)
            </h2>

            {loadingTrending ? (
              <p className="text-slate-500">Loading new OTT releases...</p>
            ) : trendingMovies.length === 0 ? (
              <p className="text-slate-500">No new OTT releases available right now.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {trendingMovies.map((movie) => {
                  const mediaLabel = movie.mediaType === "series" ? "Series" : "Movie";
                  const card = (
                    <div className="h-full rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
                      <img
                        src={movie.poster || "https://placehold.co/500x750?text=No+Image"}
                        alt={movie.title}
                        className="h-64 w-full rounded-lg object-cover"
                        onError={(e) => {
                          e.target.src = "https://placehold.co/500x750?text=No+Image";
                        }}
                      />
                      <h3 className="mt-3 line-clamp-1 text-lg font-bold">{movie.title}</h3>
                      <p className="text-sm text-slate-500">{movie.year}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                            movie.platform === "Netflix"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                              : movie.platform === "Amazon Prime Video"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                          }`}
                        >
                          {movie.platform}
                        </span>
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {mediaLabel}
                        </span>
                      </div>
                    </div>
                  );

                  if (!movie.imdbID || movie.mediaType === "series") {
                    return <div key={movie.id || `${movie.title}-${movie.platform}`}>{card}</div>;
                  }

                  return (
                    <Link key={movie.imdbID} to={`/movie/${movie.imdbID}`} className="block">
                      {card}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </PageTransition>
  );
};

export default AvailabilityAlerts;

