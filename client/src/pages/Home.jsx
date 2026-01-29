import { useState, useEffect, useContext } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";
import Recommendations from "../components/movie/Recommendations";
import { AuthContext } from "../context/AuthContext";
import { toast, Toaster } from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

const Home = () => {
  const { user } = useContext(AuthContext);

  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState([]);
  const [exploreMovies, setExploreMovies] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [feed, setFeed] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [error, setError] = useState(null);
  const [openCommentSection, setOpenCommentSection] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [editingComment, setEditingComment] = useState(null); // { reviewId, commentId }
  const [editText, setEditText] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // 📰 Load friends activity feed
  const fetchFeed = async (pageNum, isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoadingFeed(true);

    try {
      const res = await api.get(`/api/reviews/feed/friends?page=${pageNum}&limit=9`);
      const { reviews, hasMore: moreAvailable } = res.data;
      
      setFeed(prev => isLoadMore ? [...prev, ...reviews] : reviews);
      setHasMore(moreAvailable);
    } catch (err) {
      if (!isLoadMore) setFeed([]);
    } finally {
      setLoadingFeed(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFeed(1);
    }
  }, [user]);

  // 🎬 Load initial movies to avoid a blank page
  useEffect(() => {
    const fetchInitialMovies = async () => {
      setLoadingSearch(true);
      setLoadingTrending(true);
      try {
        const omdbKey = import.meta.env.VITE_OMDB_API_KEY;
        
        // Fetch Explore Movies (e.g., 2024)
        const exploreRes = await fetch(`https://www.omdbapi.com/?s=2024&type=movie&apikey=${omdbKey}`);
        const exploreData = await exploreRes.json();
        if (exploreData.Response === "True") {
          setExploreMovies(exploreData.Search);
        }

        // Fetch Trending Movies (e.g., Marvel)
        const trendingRes = await fetch(`https://www.omdbapi.com/?s=Marvel&type=movie&apikey=${omdbKey}`);
        const trendingData = await trendingRes.json();
        if (trendingData.Response === "True") {
          setTrendingMovies(trendingData.Search);
        }
      } catch (err) {
        console.error("Failed to fetch initial movies", err);
      } finally {
        setLoadingSearch(false);
        setLoadingTrending(false);
      }
    };
    fetchInitialMovies();
  }, []);

  const handleLike = async (reviewId) => {
    if (!user) {
      toast.error("Please login to like reviews.");
      return;
    }

    try {
      const res = await api.post(`/api/reviews/${reviewId}/like`);
      setFeed((prev) =>
        prev.map((r) => (r._id === reviewId ? { ...r, likes: res.data.likes } : r))
      );
    } catch (err) {
      toast.error("Failed to update like.");
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFeed(nextPage, true);
  };

  const handlePostComment = async (reviewId) => {
    if (!commentText.trim()) return;
    try {
      const res = await api.post(`/api/reviews/${reviewId}/comments`, { text: commentText });
      // Update the specific review in the feed with the new comment data
      setFeed((prev) =>
        prev.map((r) => (r._id === reviewId ? { ...r, comments: res.data.comments } : r))
      );
      setCommentText("");
      toast.success("Comment posted!");
    } catch (err) {
      toast.error("Failed to post comment.");
    }
  };

  const handleUpdateComment = async (reviewId, commentId) => {
    if (!editText.trim()) return;
    try {
      const res = await api.put(`/api/reviews/${reviewId}/comments/${commentId}`, { text: editText });
      setFeed((prev) =>
        prev.map((r) => (r._id === reviewId ? { ...r, comments: res.data.comments } : r))
      );
      setEditingComment(null);
      setEditText("");
      toast.success("Comment updated!");
    } catch (err) {
      toast.error("Failed to update comment.");
    }
  };

  const handleDeleteComment = async (reviewId, commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      const res = await api.delete(`/api/reviews/${reviewId}/comments/${commentId}`);
      setFeed((prev) =>
        prev.map((r) => (r._id === reviewId ? { ...r, comments: res.data.comments } : r))
      );
      toast.success("Comment deleted");
    } catch (err) {
      toast.error("Failed to delete comment.");
    }
  };

  const searchMovies = async () => {
    if (!query.trim()) return;
    setLoadingSearch(true);
    setError(null);
    try {
      const omdbKey = import.meta.env.VITE_OMDB_API_KEY;
      const res = await fetch(`https://www.omdbapi.com/?s=${query}&apikey=${omdbKey}`);
      const data = await res.json();
      if (data.Response === "True") {
        setMovies(data.Search);
      } else {
        setError(data.Error || "No movies found.");
      }
    } catch (err) {
      setError("Failed to search movies. Please try again.");
    } finally {
      setLoadingSearch(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 mb-4 drop-shadow-lg">
            🎬 CineCircle
          </h1>
          <p className="text-gray-400 text-xl">Discover, Track, and Share your favorite movies.</p>
        </header>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-xl mb-8 flex justify-between items-center max-w-2xl mx-auto">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-200 hover:text-white font-bold">✕</button>
          </div>
        )}

        {/* 🔍 Search */}
        <div className="flex justify-center gap-4 mb-16">
          <input
            className="w-full max-w-2xl bg-gray-800 text-white border border-gray-700 rounded-full px-6 py-4 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all shadow-lg text-lg placeholder-gray-500"
            placeholder="Search for movies..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchMovies()}
          />
          <button
            onClick={searchMovies}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3 px-10 rounded-full shadow-lg transform transition hover:scale-105 active:scale-95"
          >
            Search
          </button>
        </div>

        {/* 🎥 Search Results */}
        {loadingSearch || loadingTrending ? (
          <div className="flex justify-center items-center h-32 mb-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-red-500"></div>
          </div>
        ) : (
          <>
            {query ? (
              // Search Results
              movies.length > 0 && (
                <section className="mb-16 animate-fade-in">
                  <h2 className="text-3xl font-bold mb-8 border-l-4 border-red-500 pl-4">🎥 Search Results</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
                    {movies.map((movie) => (
                      <Link key={movie.imdbID} to={`/movie/${movie.imdbID}`} className="group">
                        <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl h-full flex flex-col border border-gray-700">
                          <div className="relative aspect-[2/3] overflow-hidden">
                            <img
                              src={movie.Poster !== "N/A" ? movie.Poster : "https://via.placeholder.com/500x750?text=No+Image"}
                              alt={movie.Title}
                              onError={(e) => { e.target.src = "https://via.placeholder.com/500x750?text=No+Image"; }}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300"></div>
                          </div>
                          <div className="p-4 flex-grow flex flex-col justify-between">
                            <h3 className="font-semibold text-lg leading-tight mb-1 group-hover:text-red-400 transition-colors">{movie.Title}</h3>
                            <p className="text-gray-500 text-sm">{movie.Year}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )
            ) : (
              // Trending and Explore Sections
              <>
                {trendingMovies.length > 0 && (
                  <section className="mb-16 animate-fade-in">
                    <h2 className="text-3xl font-bold mb-8 border-l-4 border-orange-500 pl-4">📈 Trending Now</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
                      {trendingMovies.map((movie) => (
                        <Link key={movie.imdbID} to={`/movie/${movie.imdbID}`} className="group">
                          <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl h-full flex flex-col border border-gray-700">
                            <div className="relative aspect-[2/3] overflow-hidden">
                              <img
                                src={movie.Poster !== "N/A" ? movie.Poster : "https://via.placeholder.com/500x750?text=No+Image"}
                                alt={movie.Title}
                                onError={(e) => { e.target.src = "https://via.placeholder.com/500x750?text=No+Image"; }}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300"></div>
                            </div>
                            <div className="p-4 flex-grow flex flex-col justify-between">
                              <h3 className="font-semibold text-lg leading-tight mb-1 group-hover:text-red-400 transition-colors">{movie.Title}</h3>
                              <p className="text-gray-500 text-sm">{movie.Year}</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {exploreMovies.length > 0 && (
                  <section className="mb-16 animate-fade-in">
                    <h2 className="text-3xl font-bold mb-8 border-l-4 border-red-500 pl-4">🔥 Explore Movies</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
                      {exploreMovies.map((movie) => (
                        <Link key={movie.imdbID} to={`/movie/${movie.imdbID}`} className="group">
                          <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl h-full flex flex-col border border-gray-700">
                            <div className="relative aspect-[2/3] overflow-hidden">
                              <img
                                src={movie.Poster !== "N/A" ? movie.Poster : "https://via.placeholder.com/500x750?text=No+Image"}
                                alt={movie.Title}
                                onError={(e) => { e.target.src = "https://via.placeholder.com/500x750?text=No+Image"; }}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300"></div>
                            </div>
                            <div className="p-4 flex-grow flex flex-col justify-between">
                              <h3 className="font-semibold text-lg leading-tight mb-1 group-hover:text-red-400 transition-colors">{movie.Title}</h3>
                              <p className="text-gray-500 text-sm">{movie.Year}</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}

        {/* 🤖 Recommendations */}
        {user && <div className="mb-16"><Recommendations /></div>}

        {/* 📰 Friends Activity Feed */}
        {loadingFeed ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
          </div>
        ) : user && feed.length > 0 && (
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-8 border-l-4 border-blue-500 pl-4">📰 Friends Activity</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {feed.map((r) => (
                <div key={r._id} className="bg-gray-800/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all border border-gray-700 flex flex-col gap-4 group">
                  <div className="border-b border-gray-700 pb-3">
                    <Link to={`/movie/${r.movieId}`}>
                      <h3 className="text-red-500 font-extrabold text-lg flex items-center gap-2 group-hover:text-red-400 transition-colors">
                        🎬 {r.movieTitle || "A Movie"}
                      </h3>
                    </Link>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg mr-3 shadow-inner">
                      {r.user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="font-bold text-white leading-none mb-1">{r.user?.name || "Unknown"}</p>
                      <div className="flex text-yellow-500 text-xs">
                        {"★".repeat(Math.round(r.rating / 2)) || "★"}
                        <span className="text-gray-500 ml-1">({r.rating}/10)</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-300 italic leading-relaxed bg-gray-900/40 p-3 rounded-xl border border-gray-700/50">"{r.comment}"</p>
                  
                  <div className="mt-auto pt-3 border-t border-gray-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLike(r._id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                          r.likes?.includes(user?._id)
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                            : "text-gray-400 hover:bg-gray-700 border border-transparent"
                        }`}
                      >
                        <span className="text-lg">{r.likes?.includes(user?._id) ? "👍" : "🤍"}</span>
                        <span className="font-medium text-sm">{r.likes?.length || 0}</span>
                      </button>
                       <button
                        onClick={() => setOpenCommentSection(openCommentSection === r._id ? null : r._id)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-400 hover:bg-gray-700 transition-all border border-transparent"
                        title="Comment"
                      >
                        <span className="text-lg">💬</span>
                        <span className="font-medium text-sm">{r.comments?.length || 0}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1">
                      🕒 {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                    </p>
                  </div>

                  {openCommentSection === r._id && (
                    <div className="mt-2 pt-4 border-t border-gray-700 animate-fade-in">
                      <div className="space-y-3 mb-4 max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700">
                        {r.comments?.map((c, idx) => (
                          <div key={c._id || idx} className="text-sm bg-gray-900/50 p-2 rounded-lg flex flex-col gap-1 group/comment">
                            {editingComment?.commentId === c._id ? (
                              <div className="flex flex-col gap-2 w-full">
                                <input
                                  type="text"
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                                  autoFocus
                                  onKeyDown={(e) => e.key === "Enter" && handleUpdateComment(r._id, c._id)}
                                />
                                <div className="flex gap-3">
                                  <button onClick={() => handleUpdateComment(r._id, c._id)} className="text-[10px] text-blue-400 font-bold hover:underline">Save</button>
                                  <button onClick={() => setEditingComment(null)} className="text-[10px] text-gray-500 font-bold hover:underline">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-start">
                                <div className="flex flex-col">
                                  <div>
                                    <span className="font-bold text-blue-400 mr-2">{c.user?.name || "User"}:</span>
                                    <span className="text-gray-300">{c.text}</span>
                                  </div>
                                  <span className="text-[10px] text-gray-500 mt-0.5">
                                    {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : "Just now"}
                                  </span>
                                </div>
                                {(c.user?._id === user?._id || c.user === user?._id) && (
                                  <div className="flex gap-2 opacity-0 group-hover/comment:opacity-100 transition-opacity ml-2">
                                    <button 
                                      onClick={() => { setEditingComment({ reviewId: r._id, commentId: c._id }); setEditText(c.text); }}
                                      className="text-gray-500 hover:text-blue-400 transition-colors"
                                      title="Edit comment"
                                    >
                                      ✎
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteComment(r._id, c._id)}
                                      className="text-gray-500 hover:text-red-500 transition-colors"
                                      title="Delete comment"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                        {(!r.comments || r.comments.length === 0) && (
                          <p className="text-xs text-gray-500 italic">No comments yet.</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Write a comment..."
                          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                          onKeyDown={(e) => e.key === "Enter" && handlePostComment(r._id)}
                        />
                        <button
                          onClick={() => handlePostComment(r._id)}
                          disabled={!commentText.trim()}
                          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="mt-12 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-12 rounded-full border border-gray-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : "Load More Activity"}
                </button>
              </div>
            )}
          </section>
        )}
        <Toaster position="bottom-center" />
      </div>
    </div>
  );
};

export default Home;
