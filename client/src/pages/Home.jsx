import { useState, useEffect, useContext } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";
import Recommendations from "../components/movie/Recommendations";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { NotificationContext } from "../context/NotificationContext";
import { SocketContext } from "../context/SocketContext";
import PageTransition from "../components/layout/PageTransition";

const Home = () => {
  const { user } = useContext(AuthContext);
  const { setUnreadCount } = useContext(NotificationContext);
  const socket = useContext(SocketContext);

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
  const [friends, setFriends] = useState([]);
  const [mentionSearch, setMentionSearch] = useState("");
  const [activeMentionInput, setActiveMentionInput] = useState(null); // 'new' or 'edit'
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);

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
      api.get("/api/friends")
        .then(res => setFriends(res.data))
        .catch(err => console.error("Failed to fetch friends", err));
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

      // 📡 Emit socket event to notify the owner
      const review = feed.find(f => f._id === reviewId);
      if (review.user._id !== user._id) {
        socket.emit("sendNotification", {
          recipientId: review.user._id,
          senderName: user.name,
          type: "like",
          movieTitle: review.movieTitle
        });
      }
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

      // 📡 Emit socket event to notify the owner
      const review = feed.find(f => f._id === reviewId);
      if (review.user._id !== user._id) {
        socket.emit("sendNotification", {
          recipientId: review.user._id,
          senderName: user.name,
          type: "comment",
          movieTitle: review.movieTitle
        });
      }

      // 📣 Emit socket events for mentions
      if (res.data.mentionedUsers) {
        res.data.mentionedUsers.forEach(mUser => {
          socket.emit("sendNotification", {
            recipientId: mUser._id,
            senderName: user.name,
            type: "mention",
            movieTitle: review.movieTitle
          });
        });
      }

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

      // 📡 Emit socket event to notify the owner
      const review = feed.find(f => f._id === reviewId);
      if (review.user._id !== user._id) {
        socket.emit("sendNotification", {
          recipientId: review.user._id,
          senderName: user.name,
          type: "comment",
          movieTitle: review.movieTitle
        });
      }

      // 📣 Emit socket events for mentions
      if (res.data.mentionedUsers) {
        res.data.mentionedUsers.forEach(mUser => {
          socket.emit("sendNotification", {
            recipientId: mUser._id,
            senderName: user.name,
            type: "mention",
            movieTitle: review.movieTitle
          });
        });
      }

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

  const handleInputChange = (e, type) => {
    const val = e.target.value;
    if (type === 'new') setCommentText(val);
    else setEditText(val);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");

    if (lastAtSymbol !== -1) {
      const query = textBeforeCursor.substring(lastAtSymbol + 1);
      if (!query.includes(" ")) {
        setMentionSearch(query);
        setActiveMentionInput(type);
        setMentionStartIndex(lastAtSymbol);
        return;
      }
    }
    setActiveMentionInput(null);
  };

  const renderTextWithMentions = (text) => {
    if (!text) return "";
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        const username = part.substring(1);
        const targetUser = friends.find(f => f.name === username) || (user?.name === username ? user : null);

        if (targetUser) {
          return (
            <Link key={index} to={`/profile/${targetUser._id || targetUser.id}`} className="text-blue-400 font-semibold hover:underline cursor-pointer">
              {part}
            </Link>
          );
        }
        return (
          <span key={index} className="text-blue-400 font-semibold">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const insertMention = (friendName) => {
    const currentText = activeMentionInput === 'new' ? commentText : editText;
    const newText = currentText.substring(0, mentionStartIndex) + `@${friendName} ` + currentText.substring(mentionStartIndex + mentionSearch.length + 1);
    
    if (activeMentionInput === 'new') setCommentText(newText);
    else setEditText(newText);
    setActiveMentionInput(null);
  };

  const renderMentionDropdown = () => {
    const filteredFriends = friends.filter(f => 
      f.name.toLowerCase().includes(mentionSearch.toLowerCase())
    );
    if (filteredFriends.length === 0) return null;
    return (
      <div className="absolute bottom-full left-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl mb-1 z-50 max-h-40 overflow-y-auto">
        {filteredFriends.map(f => (
          <div key={f._id} onClick={() => insertMention(f.name)} className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                {f.avatar && f.avatar.trim() !== "" ? (
                <img 
                    src={(f.avatar.startsWith('http') || f.avatar.startsWith('data:')) ? f.avatar : `http://localhost:5000${f.avatar.startsWith('/') ? '' : '/'}${f.avatar}`} 
                  alt={f.name} 
                  className="w-full h-full object-cover" 
                  onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name)}&background=random`; }}
                />
              ) : (
                f.name.charAt(0).toUpperCase()
              )}
            </div>
            <span className="text-sm text-slate-900 dark:text-slate-100">{f.name}</span>
          </div>
        ))}
      </div>
    );
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
    <PageTransition>
      <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 p-4 md:p-8 transition-colors duration-500">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500 mb-4 drop-shadow-lg">
            🎬 CineCircle
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl">Discover, Track, and Share your favorite movies.</p>
        </header>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 px-4 py-3 rounded-xl mb-8 flex justify-between items-center max-w-2xl mx-auto">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="hover:text-rose-800 dark:hover:text-rose-200 font-bold">✕</button>
          </div>
        )}

        {/* 🔍 Search */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16">
          <input
            className="w-full max-w-2xl bg-white dark:bg-slate-900/50 backdrop-blur-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-full px-6 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm text-lg placeholder-slate-400 dark:placeholder-slate-500"
            placeholder="Search for movies..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchMovies()}
          />
          <button
            onClick={searchMovies}
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold py-3 px-10 rounded-full shadow-lg transform transition hover:scale-105 active:scale-95"
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
                  <h2 className="text-3xl font-bold mb-8 border-l-4 border-rose-500 pl-4">🎥 Search Results</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-8">
                    {movies.map((movie) => (
                      <Link key={movie.imdbID} to={`/movie/${movie.imdbID}`} className="group">
                        <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/20 transition-all duration-300 group-hover:-translate-y-2 h-full flex flex-col border border-slate-200 dark:border-slate-800">
                          <div className="relative aspect-[2/3] overflow-hidden">
                            <img
                              src={movie.Poster !== "N/A" ? movie.Poster : "https://placehold.co/500x750?text=No+Image"}
                              alt={movie.Title}
                              onError={(e) => { e.target.src = "https://placehold.co/500x750?text=No+Image"; }}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300"></div>
                          </div>
                          <div className="p-4 flex-grow flex flex-col justify-between bg-white dark:bg-slate-900">
                            <h3 className="font-semibold text-lg leading-tight mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-slate-900 dark:text-slate-100">{movie.Title}</h3>
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-8">
                      {trendingMovies.map((movie) => (
                        <Link key={movie.imdbID} to={`/movie/${movie.imdbID}`} className="group">
                          <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group-hover:-translate-y-2 h-full flex flex-col border border-slate-200 dark:border-slate-800">
                            <div className="relative aspect-[2/3] overflow-hidden">
                              <img
                                src={movie.Poster !== "N/A" ? movie.Poster : "https://placehold.co/500x750?text=No+Image"}
                                alt={movie.Title}
                                onError={(e) => { e.target.src = "https://placehold.co/500x750?text=No+Image"; }}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300"></div>
                            </div>
                            <div className="p-4 flex-grow flex flex-col justify-between bg-white dark:bg-slate-900">
                              <h3 className="font-semibold text-lg leading-tight mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-slate-900 dark:text-slate-100">{movie.Title}</h3>
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-8">
                      {exploreMovies.map((movie) => (
                        <Link key={movie.imdbID} to={`/movie/${movie.imdbID}`} className="group">
                          <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group-hover:-translate-y-2 h-full flex flex-col border border-slate-200 dark:border-slate-800">
                            <div className="relative aspect-[2/3] overflow-hidden">
                              <img
                                src={movie.Poster !== "N/A" ? movie.Poster : "https://placehold.co/500x750?text=No+Image"}
                                alt={movie.Title}
                                onError={(e) => { e.target.src = "https://placehold.co/500x750?text=No+Image"; }}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300"></div>
                            </div>
                            <div className="p-4 flex-grow flex flex-col justify-between bg-white dark:bg-slate-900">
                              <h3 className="font-semibold text-lg leading-tight mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-slate-900 dark:text-slate-100">{movie.Title}</h3>
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
            <h2 className="text-3xl font-bold mb-8 border-l-4 border-indigo-500 pl-4">📰 Friends Activity</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {feed.map((r) => (
                <div key={r._id} className="bg-white dark:bg-slate-900/40 backdrop-blur-sm p-6 rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-800 flex flex-col gap-4 group">
                  <div className="border-b border-slate-100 dark:border-slate-800/50 pb-3">
                    <Link to={`/movie/${r.movieId}`}>
                      <h3 className="text-indigo-600 dark:text-indigo-400 font-extrabold text-lg flex items-center gap-2 hover:text-rose-500 transition-colors">
                        🎬 {r.movieTitle || "A Movie"}
                      </h3>
                    </Link>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg mr-3 shadow-inner overflow-hidden">
                      {r.user?.avatar && r.user.avatar.trim() !== "" ? (
                        <img 
                          src={(r.user.avatar.startsWith('http') || r.user.avatar.startsWith('data:')) ? r.user.avatar : `http://localhost:5000${r.user.avatar.startsWith('/') ? '' : '/'}${r.user.avatar}`} 
                          alt={r.user.name} 
                          className="w-full h-full object-cover" 
                          onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(r.user?.name || 'User')}&background=random`; }}
                        />
                      ) : (
                        r.user?.name?.charAt(0).toUpperCase() || "U"
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100 leading-none mb-1">{r.user?.name || "Unknown"}</p>
                      <div className="flex text-yellow-500 text-xs">
                        {"★".repeat(Math.round(r.rating / 2)) || "★"}
                        <span className="text-slate-400 ml-1">({r.rating}/10)</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 italic leading-relaxed bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/30">"{renderTextWithMentions(r.comment)}"</p>
                  
                  <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLike(r._id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                          r.likes?.includes(user?._id)
                            ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                            : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent"
                        }`}
                      >
                        <span className="text-lg">{r.likes?.includes(user?._id) ? "👍" : "🤍"}</span>
                        <span className="font-medium text-sm">{r.likes?.length || 0}</span>
                      </button>
                       <button
                        onClick={() => setOpenCommentSection(openCommentSection === r._id ? null : r._id)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent"
                        title="Comment"
                      >
                        <span className="text-lg">💬</span>
                        <span className="font-medium text-sm">{r.comments?.length || 0}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      🕒 {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                    </p>
                  </div>

                  {openCommentSection === r._id && (
                    <div className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
                      <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                        {r.comments?.map((c, idx) => (
                          <div key={c._id || idx} className="text-sm bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl flex flex-col gap-1 group/comment border border-slate-100 dark:border-slate-800/50">
                            {editingComment?.commentId === c._id ? (
                              <div className="flex items-start gap-2 w-full">
                                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0 mt-0.5">
                                  {c.user?.avatar && c.user.avatar.trim() !== "" ? (
                                    <img 
                                      src={(c.user.avatar.startsWith('http') || c.user.avatar.startsWith('data:')) ? c.user.avatar : `http://localhost:5000${c.user.avatar.startsWith('/') ? '' : '/'}${c.user.avatar}`} 
                                      alt={c.user.name} 
                                      className="w-full h-full object-cover" 
                                      onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.user?.name || 'User')}&background=random`; }} 
                                    />
                                  ) : (
                                    c.user?.name?.charAt(0).toUpperCase() || "U"
                                  )}
                                </div>
                                <div className="flex flex-col gap-2 flex-1">
                                <div className="relative">
                                  <input
                                  type="text"
                                  value={editText}
                                  onChange={(e) => handleInputChange(e, 'edit')}
                                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                  autoFocus
                                  onKeyDown={(e) => e.key === "Enter" && handleUpdateComment(r._id, c._id)}
                                />
                                  {activeMentionInput === 'edit' && renderMentionDropdown()}
                                </div>
                                <div className="flex gap-3">
                                  <button onClick={() => handleUpdateComment(r._id, c._id)} className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Save</button>
                                  <button onClick={() => setEditingComment(null)} className="text-[10px] text-slate-500 font-bold hover:underline">Cancel</button>
                                </div>
                              </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-start">
                                <div className="flex items-start gap-2">
                                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0 mt-0.5">
                                    {c.user?.avatar && c.user.avatar.trim() !== "" ? (
                                      <img 
                                        src={(c.user.avatar.startsWith('http') || c.user.avatar.startsWith('data:')) ? c.user.avatar : `http://localhost:5000${c.user.avatar.startsWith('/') ? '' : '/'}${c.user.avatar}`} 
                                        alt={c.user.name} 
                                        className="w-full h-full object-cover" 
                                        onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.user?.name || 'User')}&background=random`; }} 
                                      />
                                    ) : (
                                      c.user?.name?.charAt(0).toUpperCase() || "U"
                                    )}
                                  </div>
                                  <div className="flex flex-col">
                                    <div>
                                      <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-2">{c.user?.name || "User"}:</span>
                                      <span className="text-slate-700 dark:text-slate-300">{renderTextWithMentions(c.text)}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 mt-0.5">
                                      {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : "Just now"}
                                    </span>
                                  </div>
                                </div>
                                {(c.user?._id === user?._id || c.user === user?._id) && (
                                  <div className="flex gap-2 opacity-0 group-hover/comment:opacity-100 transition-opacity ml-2">
                                    <button 
                                      onClick={() => { setEditingComment({ reviewId: r._id, commentId: c._id }); setEditText(c.text); }}
                                      className="text-slate-400 hover:text-indigo-500 transition-colors"
                                      title="Edit comment"
                                    >
                                      ✎
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteComment(r._id, c._id)}
                                      className="text-slate-400 hover:text-rose-500 transition-colors"
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
                          <p className="text-xs text-slate-500 italic">No comments yet.</p>
                        )}
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold overflow-hidden shrink-0 mt-1">
                          {user?.avatar && user.avatar.trim() !== "" ? (
                            <img 
                              src={(user.avatar.startsWith('http') || user.avatar.startsWith('data:')) ? user.avatar : `http://localhost:5000${user.avatar.startsWith('/') ? '' : '/'}${user.avatar}`} 
                              alt={user.name} 
                              className="w-full h-full object-cover" 
                              onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`; }} 
                            />
                          ) : (
                            user?.name?.charAt(0).toUpperCase() || "U"
                          )}
                        </div>
                        <div className="flex-1 relative">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => handleInputChange(e, 'new')}
                          placeholder="Write a comment..."
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                          onKeyDown={(e) => e.key === "Enter" && handlePostComment(r._id)}
                        />
                        {activeMentionInput === 'new' && renderMentionDropdown()}
                        </div>
                        <button
                          onClick={() => handlePostComment(r._id)}
                          disabled={!commentText.trim()}
                          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors"
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
                  className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-bold py-3 px-12 rounded-full border border-slate-200 dark:border-slate-800 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : "Load More Activity"}
                </button>
              </div>
            )}
          </section>
        )}
      </div>
      </div>
    </PageTransition>
  );
};

export default Home;
