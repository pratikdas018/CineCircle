import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { toast } from "react-hot-toast";
import PageTransition from "../components/layout/PageTransition";

const Clubs = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [clubs, setClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState(null);
  const [selectedClub, setSelectedClub] = useState(null);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  const [clubName, setClubName] = useState("");
  const [clubDescription, setClubDescription] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);

  const [addMemberId, setAddMemberId] = useState("");
  const [movieQuery, setMovieQuery] = useState("");
  const [movieResults, setMovieResults] = useState([]);
  const [isSearchingMovies, setIsSearchingMovies] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");

  const isOwner = selectedClub && user && selectedClub.owner?._id === user._id;

  const loadClubs = useCallback(async () => {
    const res = await api.get("/api/clubs");
    setClubs(res.data || []);
    if (!selectedClubId && res.data?.length) {
      setSelectedClubId(res.data[0]._id);
    }
  }, [selectedClubId]);

  const loadFriends = useCallback(async () => {
    const res = await api.get("/api/friends");
    setFriends(res.data || []);
  }, []);

  const loadClubDetails = useCallback(async (clubId) => {
    if (!clubId) return;
    const res = await api.get(`/api/clubs/${clubId}`);
    setSelectedClub(res.data);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const init = async () => {
      try {
        setLoading(true);
        await Promise.all([loadClubs(), loadFriends()]);
      } catch {
        toast.error("Failed to load clubs");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user, navigate, loadClubs, loadFriends]);

  useEffect(() => {
    if (!selectedClubId) {
      setSelectedClub(null);
      return;
    }
    loadClubDetails(selectedClubId).catch(() => toast.error("Failed to load club details"));
  }, [selectedClubId, loadClubDetails]);

  const updateClubState = async (updatedClub) => {
    setSelectedClub(updatedClub);
    setClubs((prev) => {
      const exists = prev.some((club) => club._id === updatedClub._id);
      if (!exists) return [updatedClub, ...prev];
      return prev.map((club) => (club._id === updatedClub._id ? updatedClub : club));
    });
    await loadClubs();
  };

  const createClub = async () => {
    if (!clubName.trim()) return toast.error("Club name is required");
    try {
      const { data } = await api.post("/api/clubs", {
        name: clubName,
        description: clubDescription,
        memberIds: selectedFriendIds,
      });
      setClubName("");
      setClubDescription("");
      setSelectedFriendIds([]);
      await updateClubState(data);
      setSelectedClubId(data._id);
      toast.success("Club created");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create club");
    }
  };

  const toggleFriendSelection = (friendId) => {
    setSelectedFriendIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  const addMember = async () => {
    if (!addMemberId || !selectedClub) return;
    try {
      const { data } = await api.post(`/api/clubs/${selectedClub._id}/members`, { userId: addMemberId });
      setAddMemberId("");
      await updateClubState(data);
      toast.success("Member added");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add member");
    }
  };

  const removeMember = async (memberId) => {
    if (!selectedClub) return;
    try {
      const { data } = await api.delete(`/api/clubs/${selectedClub._id}/members/${memberId}`);
      await updateClubState(data);
      toast.success("Member removed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member");
    }
  };

  const searchMovies = async () => {
    if (!movieQuery.trim()) return;
    try {
      setIsSearchingMovies(true);
      const { data } = await api.get(`/api/movies/search?q=${encodeURIComponent(movieQuery.trim())}`);
      setMovieResults(data || []);
    } catch {
      toast.error("Failed to search movies");
    } finally {
      setIsSearchingMovies(false);
    }
  };

  const addMovieToClub = async (movie) => {
    if (!selectedClub) return;
    try {
      const { data } = await api.post(`/api/clubs/${selectedClub._id}/watchlist`, {
        movieId: movie.imdbID,
        title: movie.Title,
        posterPath: movie.Poster !== "N/A" ? movie.Poster : "",
        releaseDate: movie.Year,
      });
      await updateClubState(data);
      toast.success("Movie added to club watchlist");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add movie");
    }
  };

  const removeMovieFromClub = async (movieId) => {
    if (!selectedClub) return;
    try {
      const { data } = await api.delete(`/api/clubs/${selectedClub._id}/watchlist/${movieId}`);
      await updateClubState(data);
      toast.success("Movie removed from club");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove movie");
    }
  };

  const toggleVote = async (movieId) => {
    if (!selectedClub) return;
    try {
      const { data } = await api.post(`/api/clubs/${selectedClub._id}/watchlist/${movieId}/vote`);
      await updateClubState(data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to vote");
    }
  };

  const finalizeNextMovieNight = async () => {
    if (!selectedClub) return;
    try {
      const { data } = await api.post(`/api/clubs/${selectedClub._id}/next-movie-night/select`, {
        scheduledFor: scheduledFor || null,
      });
      await updateClubState(data);
      toast.success("Next movie night selected");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to finalize next movie night");
    }
  };

  const availableFriendsToAdd = useMemo(() => {
    if (!selectedClub) return [];
    const currentMemberIds = new Set((selectedClub.members || []).map((member) => member._id));
    return friends.filter((friend) => !currentMemberIds.has(friend._id));
  }, [selectedClub, friends]);

  const hasVoted = (votes = []) =>
    votes.some((voteUser) => (voteUser?._id || voteUser).toString() === user?._id);

  const sortedWatchlist = useMemo(() => {
    if (!selectedClub?.watchlist) return [];
    return [...selectedClub.watchlist].sort((a, b) => b.votes.length - a.votes.length);
  }, [selectedClub]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen w-full overflow-x-hidden bg-transparent px-3 py-4 text-slate-900 transition-colors duration-500 dark:text-slate-100 sm:px-5 md:px-8 md:py-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-3">
          <aside className="space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <h2 className="text-xl font-bold mb-3">Create Movie Club</h2>
              <input
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                placeholder="Club name"
                className="w-full mb-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
              <textarea
                value={clubDescription}
                onChange={(e) => setClubDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full mb-3 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-20"
              />
              <p className="text-xs text-slate-500 mb-2">Invite friends:</p>
              <div className="max-h-36 overflow-y-auto space-y-1 mb-3">
                {friends.map((friend) => (
                  <label key={friend._id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedFriendIds.includes(friend._id)}
                      onChange={() => toggleFriendSelection(friend._id)}
                    />
                    <span>{friend.name}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={createClub}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold"
              >
                Create Club
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <h2 className="text-xl font-bold mb-3">My Clubs</h2>
              <div className="space-y-2">
                {clubs.map((club) => (
                  <button
                    key={club._id}
                    onClick={() => setSelectedClubId(club._id)}
                    className={`w-full text-left rounded-lg p-3 border transition-colors ${
                      selectedClubId === club._id
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <p className="font-semibold">{club.name}</p>
                    <p className="text-xs text-slate-500">
                      {(club.members || []).length} members • {(club.watchlist || []).length} movies
                    </p>
                  </button>
                ))}
                {clubs.length === 0 && <p className="text-sm text-slate-500">No clubs yet.</p>}
              </div>
            </div>
          </aside>

          <section className="lg:col-span-2 space-y-4">
            {!selectedClub ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-500">
                Select a club to manage shared watchlists and voting.
              </div>
            ) : (
              <>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <h1 className="text-2xl font-extrabold">{selectedClub.name}</h1>
                  <p className="text-sm text-slate-500 mt-1">{selectedClub.description || "No description"}</p>

                  {selectedClub.nextMovieNight && (
                    <div className="mt-4 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                      <p className="font-semibold text-emerald-700 dark:text-emerald-300">Next Movie Night Pick</p>
                      <p className="text-sm">
                        <Link to={`/movie/${selectedClub.nextMovieNight.movieId}`} className="underline">
                          {selectedClub.nextMovieNight.title}
                        </Link>
                        {selectedClub.nextMovieNight.scheduledFor
                          ? ` • ${new Date(selectedClub.nextMovieNight.scheduledFor).toLocaleString()}`
                          : ""}
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <h2 className="text-xl font-bold mb-2">Members</h2>
                  <div className="space-y-2">
                    {selectedClub.members.map((member) => (
                      <div
                        key={member._id}
                        className="flex flex-col gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <p>
                          {member.name}
                          {selectedClub.owner?._id === member._id ? " (Owner)" : ""}
                        </p>
                        {selectedClub.owner?._id !== member._id &&
                          (isOwner || member._id === user._id) && (
                            <button
                              onClick={() => removeMember(member._id)}
                              className="text-xs bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded"
                            >
                              Remove
                            </button>
                          )}
                      </div>
                    ))}
                  </div>

                  {isOwner && availableFriendsToAdd.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <select
                        value={addMemberId}
                        onChange={(e) => setAddMemberId(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      >
                        <option value="">Add friend to club...</option>
                        {availableFriendsToAdd.map((friend) => (
                          <option key={friend._id} value={friend._id}>
                            {friend.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={addMember}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <h2 className="text-xl font-bold mb-3">Group Watchlist + Voting</h2>

                  <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={movieQuery}
                      onChange={(e) => setMovieQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchMovies()}
                      placeholder="Search movie to add..."
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                    <button
                      onClick={searchMovies}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
                    >
                      Search
                    </button>
                  </div>

                  {isSearchingMovies && <p className="text-sm text-slate-500">Searching movies...</p>}

                  {movieResults.length > 0 && (
                    <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {movieResults.slice(0, 6).map((movie) => (
                        <div
                          key={movie.imdbID}
                          className="flex flex-col gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <p className="text-sm">
                            {movie.Title} <span className="text-slate-500">({movie.Year})</span>
                          </p>
                          <button
                            onClick={() => addMovieToClub(movie)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded"
                          >
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    {sortedWatchlist.map((movie) => (
                      <div
                        key={movie.movieId}
                        className="flex flex-col gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <Link to={`/movie/${movie.movieId}`} className="block break-words font-semibold hover:underline">
                            {movie.title}
                          </Link>
                          <p className="text-xs text-slate-500">
                            {movie.releaseDate || "N/A"} • {movie.votes.length} votes
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => toggleVote(movie.movieId)}
                            className={`text-xs px-2 py-1 rounded ${
                              hasVoted(movie.votes)
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-200 dark:bg-slate-700"
                            }`}
                          >
                            {hasVoted(movie.votes) ? "Voted" : "Vote"}
                          </button>
                          <button
                            onClick={() => removeMovieFromClub(movie.movieId)}
                            className="text-xs bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    {sortedWatchlist.length === 0 && (
                      <p className="text-sm text-slate-500">No movies in club watchlist yet.</p>
                    )}
                  </div>

                  {isOwner && sortedWatchlist.length > 0 && (
                    <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row">
                      <input
                        type="datetime-local"
                        value={scheduledFor}
                        onChange={(e) => setScheduledFor(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 sm:w-auto"
                      />
                      <button
                        onClick={finalizeNextMovieNight}
                        className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 sm:w-auto"
                      >
                        Pick Top Voted Movie Night
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </PageTransition>
  );
};

export default Clubs;
