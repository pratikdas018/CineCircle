import { useEffect, useState } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";

const Friends = () => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = () => {
    setLoading(true);
    api.get("/api/friends")
      .then((res) => setFriends(res.data))
      .catch(() => setError("Failed to load friends list."))
      .finally(() => setLoading(false));
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await api.get(`/api/search/users?q=${query}`);
      setSearchResults(res.data);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setSearching(false);
    }
  };

  const addFriend = async (userId) => {
    try {
      await api.post(`/api/friends/${userId}`);
      loadFriends(); // Refresh friends list
      setSearchResults((prev) => prev.filter((u) => u._id !== userId)); // Remove from search results
      setQuery("");
    } catch (err) {
      alert("Failed to add friend. " + (err.response?.data?.message || ""));
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 p-4 md:p-8 transition-all duration-500 ease-in-out">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-6 md:mb-10 border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center">
          <span className="mr-3">🤝</span> Friends
        </h1>

        {/* 🔍 Find Users Section */}
        <div className="mb-8 md:mb-12 bg-white dark:bg-slate-900/50 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm shadow-sm">
          <h2 className="text-lg md:text-xl font-bold mb-4 flex items-center">
            <span className="mr-2">🔍</span> Find Users
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search users by name..."
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 md:px-5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 w-full sm:w-auto shadow-md"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
              {searchResults.map((user) => (
                <div key={user._id} className="flex items-center justify-between bg-slate-100 dark:bg-slate-900/40 p-3 md:p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center overflow-hidden">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white mr-3 shadow-sm shrink-0 overflow-hidden">
                      {user.avatar ? (
                        <img 
                          src={(user.avatar.startsWith('http') || user.avatar.startsWith('data:')) ? user.avatar : `http://localhost:5000${user.avatar.startsWith('/') ? '' : '/'}${user.avatar}`} 
                          alt={user.name} 
                          className="w-full h-full object-cover" 
                          onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`; }}
                        />
                      ) : (
                        user.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{user.name}</span>
                  </div>
                  <button
                    onClick={() => addFriend(user._id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 md:px-4 rounded-lg text-xs md:text-sm font-medium transition-colors shadow-sm shrink-0 ml-2"
                  >
                    Add Friend
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-xl mb-6 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-200 hover:text-white font-bold">✕</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-400"></div>
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-2xl text-gray-400">You haven't added any friends yet.</p>
            <p className="text-gray-400 mt-2">Use the search above to find people to connect with!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            {friends.map((f) => (
              <Link
                key={f._id}
                to={`/chat/${f._id}`}
                className="flex items-center p-4 md:p-5 bg-white dark:bg-slate-900/40 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 group hover:-translate-y-1"
              >
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg md:text-xl mr-4 md:mr-5 shadow-sm shrink-0">
                  {f.avatar ? (
                    <img 
                      src={(f.avatar.startsWith('http') || f.avatar.startsWith('data:')) ? f.avatar : `http://localhost:5000${f.avatar.startsWith('/') ? '' : '/'}${f.avatar}`} 
                      alt={f.name} 
                      className="w-full h-full rounded-full object-cover" 
                      onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name)}&background=random`; }}
                    />
                  ) : (
                    f.name?.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <h3 className="font-bold text-lg md:text-xl text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors truncate">{f.name}</h3>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 truncate">Click to start chatting</p>
                </div>
                <div className="text-gray-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-all text-xl md:text-2xl ml-2">
                  💬
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Friends;
