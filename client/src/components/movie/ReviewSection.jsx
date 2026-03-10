import { useMemo, useState, useContext, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import api from "../../services/api";
import { toast } from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import MentionWithPreview from "./MentionWithPreview";
import {
  FaCamera,
  FaCheck,
  FaChevronDown,
  FaPaperPlane,
  FaRegThumbsUp,
  FaStar,
  FaThumbsUp,
  FaTimes,
  FaTrash,
} from "react-icons/fa";

const getInitials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .filter(Boolean)
    .join("") || "?";

const Avatar = ({ src, name, sizeClassName = "h-9 w-9" }) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name || "avatar"}
        className={`${sizeClassName} rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-800`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${sizeClassName} grid place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-rose-500 text-xs font-bold text-white ring-1 ring-slate-200 dark:ring-slate-800`}
      title={name || ""}
      aria-label={name || "avatar"}
    >
      {getInitials(name)}
    </div>
  );
};

const ReviewSection = ({ movieId, movieTitle, onReviewAdded, onStatsUpdate, filterRating, currentUserInWatchlist, maxRating = 5 }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(maxRating);
  const [comment, setComment] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [friends, setFriends] = useState([]);
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [sort, setSort] = useState("newest"); // newest | top

  const commentLimit = 600;

  useEffect(() => {
    if (!preview) return undefined;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    setRating(maxRating);
  }, [maxRating, movieId]);

  useEffect(() => {
    if (!import.meta.env.VITE_API_BASE_URL) {
      console.warn("⚠️ VITE_API_BASE_URL is not defined in client/.env. Images from the server may not load.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await api.get(`/api/reviews/${movieId}`);
        if (!cancelled) setReviews(res.data || []);
      } catch {
        if (!cancelled) setReviews([]);
      }

      if (!user) return;

      try {
        const res = await api.get("/api/friends");
        if (!cancelled) setFriends(res.data || []);
      } catch {
        if (!cancelled) setFriends([]);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [movieId, user]);

  useEffect(() => {
    const count = reviews.length;
    const distribution = {};
    for (let i = 1; i <= maxRating; i++) {
      distribution[i] = 0;
    }
    reviews.forEach(r => {
      const val = Math.round(Number(r.rating));
      if (distribution[val] !== undefined) distribution[val]++;
    });
    const avg = count > 0 
      ? (reviews.reduce((acc, r) => acc + Number(r.rating), 0) / count).toFixed(1) 
      : 0;
    
    onStatsUpdate?.({ avg, count, distribution });
  }, [reviews, onStatsUpdate, maxRating]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  };

  const handleMentionClick = async (e, username) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const res = await api.get(`/api/search/users?q=${username}`);
      const match = res.data.find(u => u.name.toLowerCase().trim() === username.toLowerCase().trim());
      
      if (match) {
        navigate(`/profile/${match._id}`);
      } else {
        toast.error(`User "@${username}" not found`);
      }
    } catch (error) {
      console.error("Could not resolve user mention:", error);
      toast.error("Could not resolve user mention");
    }
  };

  const renderTextWithMentions = (text) => {
    if (!text) return "";
    const parts = text.split(/(@[\w.]+)/g);

    const userMap = new Map();
    friends.forEach(f => { if (f.name) userMap.set(f.name.toLowerCase().trim(), f); });
    if (user?.name) userMap.set(user.name.toLowerCase().trim(), user);
    reviews.forEach(r => {
      if (r.user?.name) userMap.set(r.user.name.toLowerCase().trim(), r.user);
    });

    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        const username = part.substring(1).toLowerCase().trim();
        const targetUser = userMap.get(username);

        return (
          <MentionWithPreview
            key={index}
            part={part}
            username={username}
            targetUser={targetUser}
            onMentionClick={handleMentionClick}
          />
        );
      }
      return part;
    });
  };

  const handleCommentChange = (e) => {
    const val = e.target.value;
    setComment(val);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");

    if (lastAtSymbol !== -1) {
      const query = textBeforeCursor.substring(lastAtSymbol + 1);
      if (!query.includes(" ")) {
        setMentionSearch(query);
        setShowMentions(true);
        setMentionStartIndex(lastAtSymbol);
        return;
      }
    }
    setShowMentions(false);
  };

  const insertMention = (friendName) => {
    const newText = comment.substring(0, mentionStartIndex) + `@${friendName} ` + comment.substring(mentionStartIndex + mentionSearch.length + 1);
    setComment(newText);
    setShowMentions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("movieId", movieId);
    formData.append("movieTitle", movieTitle);
    formData.append("rating", rating);
    formData.append("comment", comment);
    formData.append("maxRating", maxRating);
    if (image) {
      formData.append("image", image);
    }

    try {
      const res = await api.post("/api/reviews", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setComment("");
      setImage(null);
      setPreview(null);
      setReviews((prev) => {
        const exists = prev.find(r => r._id === res.data._id);
        if (exists) {
          return prev.map(r => r._id === res.data._id ? res.data : r);
        }
        return [res.data, ...prev];
      });
      if (onReviewAdded) onReviewAdded(res.data);
      const audio = new Audio("/post.mp3");
      audio.play().catch(e => console.error("Post sound failed", e));
      toast.success("Review posted successfully!");
    } catch (err) {
      setError("Failed to post review. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      await api.delete(`/api/reviews/${reviewId}`);
      setReviews((prev) => prev.filter((r) => r._id !== reviewId));
      toast.success("Review deleted");
    } catch (error) {
      console.error("Failed to delete review:", error);
      toast.error("Failed to delete review.");
    }
  };

  const handleLike = async (reviewId) => {
    if (!user) {
      toast.error("Please login to like reviews.");
      return;
    }

    try {
      const res = await api.post(`/api/reviews/${reviewId}/like`);
      setReviews((prev) =>
        prev.map((r) => (r._id === reviewId ? { ...r, likes: res.data.likes } : r))
      );
    } catch (error) {
      console.error("Failed to update like:", error);
      toast.error("Failed to update like.");
    }
  };

  const unitLabel = maxRating > 5 ? "Points" : "Stars";

  const avgRating = useMemo(() => {
    if (!reviews.length) return "0.0";
    const total = reviews.reduce((acc, review) => acc + Number(review.rating || 0), 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  const mentionSuggestions = useMemo(() => {
    if (!showMentions) return [];
    const q = mentionSearch.trim().toLowerCase();
    if (!q) return friends.slice(0, 6);
    return friends
      .filter((friend) => String(friend?.name || "").toLowerCase().includes(q))
      .slice(0, 6);
  }, [friends, mentionSearch, showMentions]);

  const displayedReviews = useMemo(() => {
    const filtered = filterRating
      ? reviews.filter((review) => Math.round(Number(review.rating)) === filterRating)
      : reviews;

    const items = [...filtered];
    if (sort === "top") {
      items.sort((a, b) => {
        const likesDiff = (b.likes?.length || 0) - (a.likes?.length || 0);
        if (likesDiff !== 0) return likesDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      return items;
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  }, [reviews, filterRating, sort]);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http") || imagePath.startsWith("https")) return imagePath;

    const baseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "";
    const normalizedPath = imagePath.replace(/\\/g, "/");
    const cleanPath = normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;

    if (!baseUrl) return cleanPath;
    const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBase}${cleanPath}`;
  };

  const canSubmit = Boolean(user) && Boolean(comment.trim()) && !loading;

  return (
    <div className="mt-10 w-full overflow-x-hidden">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="text-left">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Reviews
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Share your thoughts about <span className="font-semibold">{movieTitle}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-700 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200">
            <FaStar className="text-yellow-500" /> {avgRating} / {maxRating}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-700 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200">
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </span>

          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none rounded-full border border-slate-200 bg-white/70 px-3 py-1 pr-9 text-xs text-slate-700 shadow-sm backdrop-blur outline-none hover:bg-white dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-900"
              aria-label="Sort reviews"
            >
              <option value="newest">Newest</option>
              <option value="top">Top liked</option>
            </select>
            <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-24">
            {user ? (
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      Write a review
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      Your rating helps friends decide what to watch.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200">
                    <FaStar className="text-yellow-500" /> {rating}/{maxRating} {unitLabel}
                  </span>
                </div>

                {error && (
                  <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-left text-sm text-rose-700 dark:text-rose-200">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-left text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Rating
                      </label>
                      <span className="text-xs text-slate-500">
                        {maxRating > 5 ? "Higher is better" : "Tap stars"}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Array.from({ length: maxRating }, (_, i) => i + 1).map((value) => {
                        const active = value <= rating;
                        const isStarMode = maxRating <= 5;

                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setRating(value)}
                            className={`inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                              active
                                ? "border-indigo-500 bg-indigo-600 text-white"
                                : "border-slate-200 bg-white/60 text-slate-700 hover:bg-white dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-200 dark:hover:bg-slate-900/50"
                            }`}
                            aria-label={`Set rating to ${value}`}
                          >
                            {isStarMode ? (
                              <FaStar className={active ? "text-yellow-200" : "text-slate-400"} />
                            ) : (
                              value
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-left text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Comment
                      </label>
                      <span className="text-xs text-slate-500">
                        {comment.length}/{commentLimit}
                      </span>
                    </div>

                    <div className="relative mt-2">
                      <textarea
                        value={comment}
                        onChange={handleCommentChange}
                        placeholder="What did you like or dislike? Mention friends with @name..."
                        maxLength={commentLimit}
                        className="h-28 w-full resize-y rounded-2xl border border-slate-200 bg-white/70 p-3 text-sm text-slate-900 outline-none ring-indigo-500/30 focus:ring-4 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-100"
                      />

                      {showMentions && (
                        <div className="absolute bottom-full left-0 z-50 mb-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
                          <div className="max-h-44 overflow-y-auto p-1">
                            {mentionSuggestions.length === 0 ? (
                              <div className="px-3 py-2 text-left text-sm text-slate-500">
                                No matches
                              </div>
                            ) : (
                              mentionSuggestions.map((friend) => (
                                <button
                                  key={friend._id}
                                  type="button"
                                  onClick={() => insertMention(friend.name)}
                                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"
                                >
                                  <Avatar src={getImageUrl(friend.avatar)} name={friend.name} sizeClassName="h-7 w-7" />
                                  <span className="truncate font-semibold">{friend.name}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-left text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Photo (optional)
                    </label>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <label className="group inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-200 dark:hover:bg-slate-900/50">
                        <FaCamera className="text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200" />
                        <span>{preview ? "Change photo" : "Add photo"}</span>
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                      </label>

                      {preview && (
                        <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/30">
                          <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              setImage(null);
                              setPreview(null);
                            }}
                            className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75"
                            aria-label="Remove photo"
                          >
                            <FaTimes />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    disabled={!canSubmit}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FaPaperPlane />
                    {loading ? "Posting..." : "Post review"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 text-left shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Write a review</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Please log in to rate and review this movie.
                </p>
                <Link
                  to="/login"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700"
                >
                  Log in
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="break-words text-xl font-bold text-slate-900 dark:text-slate-100">
              {filterRating
                ? `${filterRating} ${maxRating > 5 ? "Point" : "Star"} Reviews`
                : "All reviews"}
            </h3>

            {filterRating && (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-700 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200">
                <FaCheck className="text-emerald-600 dark:text-emerald-300" /> Filtered
              </span>
            )}
          </div>

          <div className="space-y-4">
            {displayedReviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-left text-slate-600 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-300">
                <p className="font-semibold">
                  {filterRating
                    ? `No ${filterRating} ${maxRating > 5 ? "point" : "star"} reviews found.`
                    : "No reviews yet."}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {filterRating ? "Try clearing the filter to see more." : "Be the first to share your thoughts."}
                </p>
              </div>
            ) : (
              displayedReviews.map((review) => {
                const reviewUserId = String(review.user?._id || review.user || "");
                const isMine = user && reviewUserId === String(user._id);
                const isVerified = isMine ? currentUserInWatchlist : Boolean(review.isVerified);
                const avatarUrl = getImageUrl(review.user?.avatar);
                const likeCount = review.likes?.length || 0;
                const likedByMe = Boolean(user && review.likes?.includes(user._id));

                return (
                  <div
                    key={review._id}
                    className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar src={avatarUrl} name={review.user?.name} />
                        <div className="min-w-0 text-left">
                          <div className="flex flex-wrap items-center gap-2">
                            {review.user?._id ? (
                              <Link
                                to={`/profile/${review.user._id}`}
                                className="truncate font-bold text-slate-900 hover:underline dark:text-slate-100"
                              >
                                {review.user?.name || "Unknown User"}
                              </Link>
                            ) : (
                              <p className="truncate font-bold text-slate-900 dark:text-slate-100">
                                {review.user?.name || "Unknown User"}
                              </p>
                            )}

                            {isVerified && (
                              <span
                                className="animate-badge-pulse inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-200"
                                title="This user has this movie in their watchlist"
                              >
                                <FaCheck className="text-[10px]" /> Verified watcher
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-100">
                          <FaStar className="text-yellow-500" />
                          {review.rating}
                          <span className="text-xs font-semibold text-slate-500">/{review.maxRating || maxRating}</span>
                        </span>

                        {user && isMine && (
                          <button
                            onClick={() => handleDelete(review._id)}
                            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-900"
                            title="Delete review"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 text-left text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                      {renderTextWithMentions(review.comment)}
                    </div>

                    {review.image && (
                      <button
                        type="button"
                        className="mt-4 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white/60 text-left dark:border-slate-800 dark:bg-slate-900/30"
                        onClick={() => setSelectedImage(getImageUrl(review.image))}
                        title="Open image"
                      >
                        <img
                          src={getImageUrl(review.image)}
                          alt="Review attachment"
                          className="h-auto max-h-80 w-full object-cover transition-opacity hover:opacity-95"
                          loading="lazy"
                        />
                      </button>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-200/70 pt-4 dark:border-slate-800">
                      <button
                        onClick={() => handleLike(review._id)}
                        disabled={!user}
                        className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition-colors ${
                          likedByMe
                            ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200"
                            : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-900"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                        title={user ? "Like" : "Login to like"}
                      >
                        {likedByMe ? <FaThumbsUp /> : <FaRegThumbsUp />}
                        <span>{likeCount}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm sm:p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            className="fixed right-6 top-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white"
            onClick={() => setSelectedImage(null)}
            aria-label="Close"
          >
            <FaTimes className="text-xl" />
          </button>
          <img
            src={selectedImage}
            alt="Full size review"
            className="h-auto max-h-[90vh] w-full max-w-sm rounded-2xl object-contain shadow-2xl sm:max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default ReviewSection;
