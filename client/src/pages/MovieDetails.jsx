import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import StreamingProviders from "../components/movie/StreamingProviders";
import ReviewSection from "../components/movie/ReviewSection";
import TrailerModal from "../components/movie/TrailerModal";
import { toast } from "react-hot-toast";


const MovieDetails = () => {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [trailerKey, setTrailerKey] = useState(null);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [cast, setCast] = useState([]);
  const [ratingStats, setRatingStats] = useState({ avg: 0, count: 0, distribution: {} });
  const [selectedRating, setSelectedRating] = useState(null);
  const [omdbData, setOmdbData] = useState(null);

  useEffect(() => {
    api.get("/api/watchlist")
      .then((res) => {
        const exists = res.data.some((m) => m.movieId.toString() === id);
        setIsInWatchlist(exists);
      })
      .catch((err) => console.error("Failed to check watchlist", err));

    // Fetch primary movie data from OMDb
    const omdbKey = import.meta.env.VITE_OMDB_API_KEY;
    fetch(`https://www.omdbapi.com/?i=${id}&plot=full&apikey=${omdbKey}`)
      .then(res => res.json())
      .then(data => setMovie(data))
      .catch(err => console.error("OMDb fetch error:", err));
  }, [id]);

  const toggleWatchlist = async () => {
    if (isInWatchlist) {
      try {
        await api.delete(`/api/watchlist/${movie.imdbID}`);
        setIsInWatchlist(false);
        toast.success("Removed from Watchlist!");
      } catch (err) {
        toast.error("Failed to remove from watchlist.");
      }
    } else {
      try {
        await api.post("/api/watchlist", {
          movieId: movie.imdbID,
          title: movie.Title,
          posterPath: movie.Poster,
        });
        setIsInWatchlist(true);
        toast.success("Added to Watchlist!");
      } catch (err) {
        toast.error("Failed to add to watchlist.");
      }
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => toast.success("Link copied to clipboard!"))
      .catch(() => toast.error("Failed to copy link."));
  };

  if (!movie) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center text-slate-900 dark:text-slate-100 transition-all duration-500 ease-in-out">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-500 mb-4 shadow-[0_0_20px_rgba(239,68,68,0.3)]"></div>
        <p className="text-xl font-semibold animate-pulse text-gray-300 tracking-wide">Fetching Movie Details...</p>
      </div>
    );
  }

  // Determine max rating based on movie data (IMDb usually uses 10, others might use 5)
  const maxRating = movie.imdbRating && movie.imdbRating !== "N/A" ? 10 : 5;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-transparent px-3 py-4 text-slate-900 transition-all duration-500 ease-in-out dark:text-slate-100 sm:px-5 md:px-8 md:py-8 lg:px-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-6 md:flex-row md:gap-8">
          <div className="w-full shrink-0 md:w-1/3 lg:w-1/4">
            <img
              src={movie.Poster !== "N/A" ? movie.Poster : "https://placehold.co/500x750?text=No+Image"}
              alt={movie.Title}
              onError={(e) => { e.target.src = "https://placehold.co/500x750?text=No+Image"; }}
              className="w-full rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700"
            />
            <div className="mt-4 flex flex-col gap-3">
              {trailerKey && (
                <button
                  onClick={() => setIsTrailerOpen(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-105"
                >
                  <span>▶</span> Watch Trailer
                </button>
              )}
              <button
                onClick={toggleWatchlist}
                className={`w-full font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:scale-105 border ${isInWatchlist ? "bg-slate-700 border-slate-500 text-slate-200" : "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent"}`}
              >
                <span>{isInWatchlist ? "❌" : "⭐"}</span> {isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
              </button>
              <button
                onClick={handleShare}
                className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:scale-105 border border-slate-200 dark:border-slate-700"
              >
                <span>🔗</span> Share
              </button>
            </div>
          </div>

          <div className="flex-1">
            <h1 className="mb-4 break-words text-2xl font-extrabold sm:text-3xl md:text-4xl">{movie.Title}</h1>
            <div className="flex flex-wrap gap-4 text-slate-600 dark:text-slate-300 mb-6">
              {movie.Released && (
                <span className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700">
                  📅 {movie.Released}
                </span>
              )}
              {movie.Runtime !== "N/A" && (
                <span className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700">
                  ⏱️ {movie.Runtime}
                </span>
              )}
              {ratingStats.count > 0 && (
                <span className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700">
                  <span className="text-yellow-400">⭐</span> 
                  <span className="text-slate-900 dark:text-slate-100">{ratingStats.avg}</span>
                  <span className="text-gray-500">/ {maxRating}</span>
                  <span className="text-gray-400 ml-1">({ratingStats.count} {ratingStats.count === 1 ? 'review' : 'reviews'})</span>
                </span>
              )}
            </div>

            {/* OMDb Critic Ratings */}
            {movie.Ratings && (
              <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {movie.Ratings.map((r) => (
                  <div key={r.Source} className="flex items-center gap-2 bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-gray-800 px-3 py-1.5 rounded-lg shadow-inner">
                    <span className="text-xs font-bold text-gray-500 uppercase">{r.Source === "Internet Movie Database" ? "IMDb" : r.Source}</span>
                    <span className="text-sm font-extrabold text-gray-900 dark:text-white">
                      {r.Source === "Rotten Tomatoes" ? "🍅 " : 
                       r.Source === "Internet Movie Database" ? "🎬 " : "📊 "}
                      {r.Value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {ratingStats.count > 0 && (
              <div className="mb-8 w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Rating Distribution</h3>
                  {selectedRating && (
                    <button onClick={() => setSelectedRating(null)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Clear Filter</button>
                  )}
                </div>
                <div className="space-y-2">
                  {Array.from({ length: maxRating }, (_, i) => maxRating - i).map((star) => {
                    const count = ratingStats.distribution[star] || 0;
                    const percentage = ratingStats.count > 0 ? (count / ratingStats.count) * 100 : 0;
                    return (
                      <div 
                        key={star} 
                        onClick={() => setSelectedRating(selectedRating === star ? null : star)}
                        className={`flex items-center gap-3 p-1 rounded-lg cursor-pointer transition-all ${selectedRating === star ? 'bg-slate-100 dark:bg-slate-700 ring-1 ring-indigo-500' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                        <span className="text-xs font-medium text-gray-400 w-12">{star} {maxRating > 5 ? "Pts" : "Stars"}</span>
                        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="mb-6 break-words whitespace-normal text-base leading-relaxed text-slate-700 dark:text-slate-300 sm:text-lg">{movie.Plot}</p>

            <StreamingProviders movieId={movie.imdbID || id} movieTitle={movie.Title} />
            
            {movie.Actors && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">🎭 Top Cast</h2>
                <div className="flex flex-wrap gap-2">
                  {movie.Actors.split(", ").map((actor) => (
                    <div key={actor} className="break-words whitespace-normal rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                      {actor}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <ReviewSection 
          movieId={movie.imdbID} 
          movieTitle={movie.Title}
          onStatsUpdate={setRatingStats} 
          filterRating={selectedRating} 
          currentUserInWatchlist={isInWatchlist}
          maxRating={maxRating}
        />

        <TrailerModal
          isOpen={isTrailerOpen}
          onClose={() => setIsTrailerOpen(false)}
          trailerKey={trailerKey}
        />
      </div>
    </div>
  );
};

export default MovieDetails;
