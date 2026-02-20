import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { SocketContext } from "../context/SocketContext";
import { toast } from "react-hot-toast";

const Friends = () => {
  const { user } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverResults, setDiscoverResults] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchFriends = async () => {
    const res = await api.get("/api/friends");
    setFriends(res.data);
  };

  const fetchRequests = async () => {
    const res = await api.get("/api/friends/requests");
    setIncomingRequests(res.data.incoming || []);
    setOutgoingRequests(res.data.outgoing || []);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([fetchFriends(), fetchRequests()]);
      } catch (err) {
        console.error("Failed to load friends data", err);
        toast.error("Failed to load friends data");
      } finally {
        setLoading(false);
      }
    };

    if (user) loadData();
  }, [user]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleMessage = (msg) => {
      if (msg.receiver === user._id) {
        setFriends((prevFriends) =>
          prevFriends.map((friend) => {
            if (friend._id === msg.sender) {
              return {
                ...friend,
                unreadCount: (friend.unreadCount || 0) + 1,
              };
            }
            return friend;
          })
        );
      }
    };

    socket.on("receiveMessage", handleMessage);

    return () => {
      socket.off("receiveMessage", handleMessage);
    };
  }, [socket, user]);

  const searchUsers = async () => {
    if (!discoverQuery.trim()) {
      setDiscoverResults([]);
      return;
    }

    try {
      const res = await api.get(`/api/search/users?q=${encodeURIComponent(discoverQuery.trim())}`);
      const friendIds = new Set(friends.map((f) => f._id));
      const incomingIds = new Set(incomingRequests.map((r) => r._id));
      const outgoingIds = new Set(outgoingRequests.map((r) => r._id));

      const filtered = res.data.filter(
        (u) => !friendIds.has(u._id) && !incomingIds.has(u._id) && !outgoingIds.has(u._id)
      );
      setDiscoverResults(filtered);
    } catch {
      toast.error("Failed to search users");
    }
  };

  const sendRequest = async (targetId) => {
    try {
      setActionLoadingId(targetId);
      await api.post(`/api/friends/request/${targetId}`);
      toast.success("Friend request sent");
      await fetchRequests();
      await searchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send request");
    } finally {
      setActionLoadingId(null);
    }
  };

  const acceptRequest = async (targetId) => {
    try {
      setActionLoadingId(targetId);
      await api.put(`/api/friends/request/${targetId}/accept`);
      toast.success("Friend request accepted");
      await Promise.all([fetchFriends(), fetchRequests()]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to accept request");
    } finally {
      setActionLoadingId(null);
    }
  };

  const rejectRequest = async (targetId) => {
    try {
      setActionLoadingId(targetId);
      await api.delete(`/api/friends/request/${targetId}/reject`);
      toast.success("Friend request rejected");
      await fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject request");
    } finally {
      setActionLoadingId(null);
    }
  };

  const cancelRequest = async (targetId) => {
    try {
      setActionLoadingId(targetId);
      await api.delete(`/api/friends/request/${targetId}/cancel`);
      toast.success("Friend request cancelled");
      await fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel request");
    } finally {
      setActionLoadingId(null);
    }
  };

  const removeFriend = async (targetId) => {
    if (!window.confirm("Remove this friend?")) return;
    try {
      setActionLoadingId(targetId);
      await api.delete(`/api/friends/${targetId}`);
      toast.success("Friend removed");
      await fetchFriends();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove friend");
    } finally {
      setActionLoadingId(null);
    }
  };

  const getAvatarUrl = (avatar) => {
    if (!avatar) return null;
    if (avatar.startsWith("http") || avatar.startsWith("data:")) return avatar;
    const baseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "";
    return `${baseUrl}${avatar.startsWith("/") ? "" : "/"}${avatar}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-transparent px-3 py-4 text-slate-900 transition-colors duration-500 dark:text-slate-100 sm:px-5 md:px-8 md:py-8 lg:px-12">
      <div className="mx-auto w-full max-w-7xl">
        <h1 className="text-3xl font-bold mb-8 border-l-4 border-indigo-500 pl-4">Friends</h1>

        <section className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 mb-6">
          <h2 className="text-xl font-bold mb-4">Discover Users</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={discoverQuery}
              onChange={(e) => setDiscoverQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchUsers()}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2"
              placeholder="Search by name..."
            />
            <button
              onClick={searchUsers}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 sm:w-auto"
            >
              Search
            </button>
          </div>
          {discoverResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {discoverResults.map((u) => (
                <div
                  key={u._id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 overflow-hidden flex items-center justify-center text-white font-bold">
                      {u.avatar ? (
                        <img
                          src={getAvatarUrl(u.avatar)}
                          alt={u.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`;
                          }}
                        />
                      ) : (
                        u.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => sendRequest(u._id)}
                    disabled={actionLoadingId === u._id}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm px-3 py-1.5 rounded"
                  >
                    Add Friend
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 mb-6">
          <h2 className="text-xl font-bold mb-4">Incoming Requests</h2>
          {incomingRequests.length === 0 ? (
            <p className="text-sm text-slate-500">No incoming requests.</p>
          ) : (
            <div className="space-y-2">
              {incomingRequests.map((requester) => (
                <div
                  key={requester._id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold">{requester.name}</p>
                    <p className="text-xs text-slate-500">{requester.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => acceptRequest(requester._id)}
                      disabled={actionLoadingId === requester._id}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs px-3 py-1.5 rounded"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => rejectRequest(requester._id)}
                      disabled={actionLoadingId === requester._id}
                      className="bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs px-3 py-1.5 rounded"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 mb-6">
          <h2 className="text-xl font-bold mb-4">Sent Requests</h2>
          {outgoingRequests.length === 0 ? (
            <p className="text-sm text-slate-500">No pending sent requests.</p>
          ) : (
            <div className="space-y-2">
              {outgoingRequests.map((target) => (
                <div
                  key={target._id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold">{target.name}</p>
                    <p className="text-xs text-slate-500">{target.email}</p>
                  </div>
                  <button
                    onClick={() => cancelRequest(target._id)}
                    disabled={actionLoadingId === target._id}
                    className="bg-slate-600 hover:bg-slate-700 disabled:opacity-60 text-white text-xs px-3 py-1.5 rounded"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {friends.length === 0 ? (
          <div className="text-center text-gray-500 mt-10 bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-xl">You haven't added any friends yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {friends.map((friend) => (
              <div
                key={friend._id}
                className="group flex h-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <Link to={`/chat/${friend._id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                      {friend.avatar ? (
                        <img
                          src={getAvatarUrl(friend.avatar)}
                          alt={friend.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}&background=random`;
                          }}
                        />
                      ) : (
                        friend.name.charAt(0).toUpperCase()
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                      {friend.name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">{friend.email}</p>
                  </div>
                </Link>

                <div className="flex flex-wrap items-center gap-2">
                  {friend.unreadCount > 0 && (
                    <div className="bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-lg shadow-rose-500/30">
                      {friend.unreadCount}
                    </div>
                  )}
                  <button
                    onClick={() => removeFriend(friend._id)}
                    disabled={actionLoadingId === friend._id}
                    className="text-xs bg-slate-200 dark:bg-slate-700 hover:bg-rose-600 hover:text-white transition-colors px-2 py-1 rounded"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Friends;
