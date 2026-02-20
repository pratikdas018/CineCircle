import { useEffect, useState } from "react";
import api from "../services/api";
import PageTransition from "../components/layout/PageTransition";

const Watchlist = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/api/watchlist")
      .then((res) => setMovies(res.data))
      .catch(() => setError("Failed to load your watchlist."))
      .finally(() => setLoading(false));
  }, []);

  const removeMovie = async (id) => {
    try {
      await api.delete(`/api/watchlist/${id}`);
      setMovies(movies.filter((m) => m.movieId !== id));
    } catch (err) {
      setError("Failed to remove movie. Please try again.");
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen w-full overflow-x-hidden bg-transparent px-3 py-4 text-slate-900 transition-all duration-500 ease-in-out dark:text-slate-100 sm:px-5 md:px-8 md:py-8 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-10 border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center">
          <span className="mr-3 text-yellow-400 drop-shadow-md">⭐</span> My Watchlist
        </h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-xl mb-6 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-200 hover:text-white font-bold">✕</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-400"></div>
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-20 md:py-32 bg-white dark:bg-slate-900/30 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
            <p className="text-2xl md:text-3xl text-slate-500 font-light">Your watchlist is empty.</p>
            <p className="text-slate-400 mt-4 text-lg">Go explore and add some movies to track!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6 lg:grid-cols-4 lg:gap-8 xl:grid-cols-5">
            {movies.map((movie) => (
              <div key={movie.movieId} className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group relative border border-slate-200 dark:border-slate-800">
                <div className="relative aspect-[2/3]">
                  <img
                    src={movie.posterPath && movie.posterPath !== "N/A" ? movie.posterPath : "https://placehold.co/500x750?text=No+Image"}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
                    <button
                      onClick={() => removeMovie(movie.movieId)}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transform hover:scale-105 transition-all"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold truncate text-center text-gray-900 dark:text-gray-100" title={movie.title}>{movie.title}</h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </PageTransition>
  );
};

export default Watchlist;
