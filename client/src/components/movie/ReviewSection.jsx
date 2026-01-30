import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import api from "../../services/api";
import { toast } from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

const ReviewSection = ({ movieId, movieTitle, onReviewAdded, onStatsUpdate, filterRating, currentUserInWatchlist }) => {
  const { user } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
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

  // Inject pulse animation
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes subtle-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.85; transform: scale(1.03); }
      }
      .animate-badge-pulse { animation: subtle-pulse 3s infinite ease-in-out; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    api.get(`/api/reviews/${movieId}`).then((res) => setReviews(res.data));
    if (user) {
      api.get("/api/friends").then(res => setFriends(res.data));
    }
  }, [movieId]);

  useEffect(() => {
    const count = reviews.length;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
      const val = Math.round(Number(r.rating));
      if (distribution[val] !== undefined) distribution[val]++;
    });
    const avg = count > 0 
      ? (reviews.reduce((acc, r) => acc + Number(r.rating), 0) / count).toFixed(1) 
      : 0;
    
    onStatsUpdate?.({ avg, count, distribution });
  }, [reviews, onStatsUpdate]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
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
    } catch (err) {
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
    } catch (err) {
      toast.error("Failed to update like.");
    }
  };

  return (
    <div className="mt-8">
      {user ? (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 mb-8">
      <h3 className="text-xl font-bold text-white mb-4">Write a Review</h3>
      
      {error && <p className="text-red-400 mb-2">{error}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-gray-400 text-sm mb-1">Rating</label>
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="bg-gray-900 text-white p-2 rounded border border-gray-600 focus:border-blue-500 outline-none w-full sm:w-auto"
          >
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>{r} Stars</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">Comment</label>
          <div className="relative">
          <textarea
            value={comment}
            onChange={handleCommentChange}
            placeholder="Share your thoughts..."
            className="w-full bg-gray-900 text-white p-3 rounded border border-gray-600 focus:border-blue-500 outline-none h-24 resize-none"
          />
          {showMentions && (
            <div className="absolute bottom-full left-0 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl mb-1 z-50 max-h-40 overflow-y-auto">
              {friends
                .filter(f => f.name.toLowerCase().includes(mentionSearch.toLowerCase()))
                .map(f => (
                  <div 
                    key={f._id} 
                    onClick={() => insertMention(f.name)} 
                    className="px-3 py-2 hover:bg-gray-700 cursor-pointer flex items-center gap-2 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                      {f.avatar ? (
                        <img src={f.avatar} alt={f.name} className="w-full h-full object-cover" />
                      ) : (
                        f.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="text-sm text-white">{f.name}</span>
                  </div>
                ))}
            </div>
          )}
          </div>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-2">Add a Photo (Optional)</label>
          <div className="flex items-center gap-4">
            <label className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2">
              <span>📷 Choose Image</span>
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
            {preview && (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-600">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setImage(null); setPreview(null); }}
                  className="absolute top-0 right-0 bg-black/50 text-white w-full h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-xs"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all disabled:opacity-50 mt-2"
        >
          {loading ? "Posting..." : "Post Review"}
        </button>
      </form>
        </div>
      ) : (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center mb-8">
          <p className="text-gray-400">Please login to write a review.</p>
        </div>
      )}

      <h3 className="text-2xl font-bold text-white mb-6">
        {filterRating ? `${filterRating} Star Reviews` : "Reviews"}
      </h3>
      <div className="space-y-6">
        {(() => {
          const filteredReviews = filterRating 
            ? reviews.filter(r => Math.round(Number(r.rating)) === filterRating)
            : reviews;

          if (filteredReviews.length === 0) {
            return <p className="text-gray-400">{filterRating ? `No ${filterRating} star reviews found.` : "No reviews yet. Be the first to review!"}</p>;
          }

          return filteredReviews.map((review) => (
            <div key={review._id} className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white overflow-hidden">
                    {review.user?.avatar ? (
                      <img src={review.user.avatar} alt={review.user.name} className="w-full h-full object-cover" />
                    ) : (
                      review.user?.name?.charAt(0).toUpperCase() || "U"
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-white">{review.user?.name || "Unknown User"}</p>
                      {((review.user?._id === user?._id || review.user === user?._id) ? currentUserInWatchlist : review.isVerified) && (
                        <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30 flex items-center gap-1 uppercase tracking-wider animate-badge-pulse" title="This user has this movie in their watchlist">
                          <span className="text-xs">✓</span> Verified Watcher
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-gray-700 px-3 py-1 rounded-lg">
                    <span className="text-yellow-400 mr-1">⭐</span>
                    <span className="font-bold text-white">{review.rating}</span>
                  </div>

                  {user && (review.user?._id === user._id || review.user === user._id) && (
                    <button
                      onClick={() => handleDelete(review._id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="Delete Review"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              <p className="text-gray-300 mb-4 leading-relaxed">{renderTextWithMentions(review.comment)}</p>

              {review.image && (
                <div className="mt-4">
                  <img
                    src={`${import.meta.env.VITE_API_URL || ''}${review.image}`}
                    alt="Review attachment"
                    className="rounded-lg max-h-64 object-cover border border-gray-600 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() =>
                      setSelectedImage(`${import.meta.env.VITE_API_URL || ''}${review.image}`)
                    }
                  />
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-700/50 flex items-center gap-4">
                <button
                  onClick={() => handleLike(review._id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                    review.likes?.includes(user?._id)
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                      : "text-gray-400 hover:bg-gray-700 border border-transparent"
                  }`}
                >
                  <span className="text-lg">{review.likes?.includes(user?._id) ? "👍" : "🤍"}</span>
                  <span className="font-medium">{review.likes?.length || 0}</span>
                </button>
              </div>
            </div>
          ));
        })()}
      </div>

      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="fixed top-6 right-6 text-white/70 hover:text-white text-5xl font-bold transition-colors z-50"
            onClick={() => setSelectedImage(null)}
          >
            &times;
          </button>
          <img
            src={selectedImage}
            alt="Full size review"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default ReviewSection;
