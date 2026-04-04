import { useEffect, useState } from "react";
import api from "../../services/api";
import { Link } from "react-router-dom";

const Recommendations = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRecommendations = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get(`/api/movies/recommendations/me?t=${Date.now()}`, {
        timeout: 12_000,
      });
      setMovies(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch recommendations", err);
      setMovies([]);
      setError("Recommendations are unavailable right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  return (
    <div className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Recommended For You</h2>
        <button
          onClick={fetchRecommendations}
          disabled={loading}
          className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-1.5 rounded-full border border-gray-700 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95 shadow-lg"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading && movies.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500"></div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
          {error}
        </div>
      ) : movies.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
          Add movies to your watchlist to get personalized recommendations.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 animate-fade-in sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {movies.map((m) => (
            <Link key={m.imdbID} to={`/movie/${m.imdbID}`} className="hover:scale-105 transition-transform">
              <img
                src={m.Poster !== "N/A" ? m.Poster : "https://placehold.co/500x750?text=No+Image"}
                alt={m.Title}
                className="rounded-xl shadow-lg aspect-[2/3] object-cover w-full border border-gray-800"
                onError={(e) => {
                  e.target.src = "https://placehold.co/500x750?text=No+Image";
                }}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Recommendations;
