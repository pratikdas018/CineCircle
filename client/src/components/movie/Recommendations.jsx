import { useEffect, useState } from "react";
import api from "../../services/api";
import { Link } from "react-router-dom";

const Recommendations = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRecommendations = async () => {
    setLoading(true);
    setMovies([]); // Clear current movies to show the loading spinner
    try {
      const res = await api.get(`/api/movies/recommendations/me?t=${Date.now()}`);
      setMovies(res.data);
    } catch (err) {
      console.error("Failed to fetch recommendations", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  if (!movies.length && !loading) return null;

  return (
    <div className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">🤖 {movies.length > 0 ? "Recommended For You" : "Trending Now"}</h2>
        <button 
          onClick={fetchRecommendations}
          disabled={loading}
          className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-1.5 rounded-full border border-gray-700 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95 shadow-lg"
        >
          <span className={`inline-block ${loading ? "animate-spin" : ""}`}>🔄</span> 
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading && movies.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 animate-fade-in sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {movies.map(m => (
            <Link key={m.imdbID} to={`/movie/${m.imdbID}`} className="hover:scale-105 transition-transform">
              <img
                src={m.Poster !== "N/A" ? m.Poster : "https://placehold.co/500x750?text=No+Image"}
                alt={m.Title}
                className="rounded-xl shadow-lg aspect-[2/3] object-cover w-full border border-gray-800"
                onError={(e) => { e.target.src = "https://placehold.co/500x750?text=No+Image"; }}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Recommendations;
