import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { toast } from "react-hot-toast";
import PageTransition from "../components/layout/PageTransition";
import {
  FaCalendarAlt,
  FaCrown,
  FaFilm,
  FaPlus,
  FaSearch,
  FaTrash,
  FaUsers,
  FaVoteYea,
} from "react-icons/fa";

const getInitials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .filter(Boolean)
    .join("") || "?";

const Avatar = ({ src, name, sizeClassName = "h-8 w-8" }) => {
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
      aria-label={name || "avatar"}
      title={name || ""}
    >
      {getInitials(name)}
    </div>
  );
};

const Clubs = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [clubs, setClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState(null);
  const [selectedClub, setSelectedClub] = useState(null);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clubDetailsLoading, setClubDetailsLoading] = useState(false);

  const [clubName, setClubName] = useState("");
  const [clubDescription, setClubDescription] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [clubSearch, setClubSearch] = useState("");
  const [creatingClub, setCreatingClub] = useState(false);

  const [addMemberId, setAddMemberId] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [movieQuery, setMovieQuery] = useState("");
  const [movieResults, setMovieResults] = useState([]);
  const [isSearchingMovies, setIsSearchingMovies] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");
  const [finalizingMovieNight, setFinalizingMovieNight] = useState(false);

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

    setClubDetailsLoading(true);
    setSelectedClub(null);
    loadClubDetails(selectedClubId)
      .catch(() => toast.error("Failed to load club details"))
      .finally(() => setClubDetailsLoading(false));
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
      setCreatingClub(true);
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
    } finally {
      setCreatingClub(false);
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
      setAddingMember(true);
      const { data } = await api.post(`/api/clubs/${selectedClub._id}/members`, { userId: addMemberId });
      setAddMemberId("");
      await updateClubState(data);
      toast.success("Member added");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add member");
    } finally {
      setAddingMember(false);
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
      setFinalizingMovieNight(true);
      const { data } = await api.post(`/api/clubs/${selectedClub._id}/next-movie-night/select`, {
        scheduledFor: scheduledFor || null,
      });
      await updateClubState(data);
      toast.success("Next movie night selected");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to finalize next movie night");
    } finally {
      setFinalizingMovieNight(false);
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

  const filteredFriends = useMemo(() => {
    const q = friendSearch.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((friend) => String(friend?.name || "").toLowerCase().includes(q));
  }, [friends, friendSearch]);

  const filteredClubs = useMemo(() => {
    const q = clubSearch.trim().toLowerCase();
    if (!q) return clubs;
    return clubs.filter((club) => String(club?.name || "").toLowerCase().includes(q));
  }, [clubs, clubSearch]);

  const topVotedMovieId = sortedWatchlist[0]?.movieId || null;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="relative min-h-screen w-full overflow-x-hidden bg-transparent px-3 py-4 text-slate-900 transition-colors duration-500 dark:text-slate-100 sm:px-5 md:px-8 md:py-8 lg:px-12">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-indigo-500/15 blur-3xl" />
          <div className="absolute -right-24 top-44 h-80 w-80 rounded-full bg-rose-500/15 blur-3xl" />
        </div>

        <div className="mx-auto mb-6 max-w-7xl text-left">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Movie Clubs</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Create a club, build a shared watchlist, vote together, and pick the next movie night.
          </p>
        </div>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-3">
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600/10 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
                      <FaPlus />
                    </span>
                    <h2 className="text-lg font-bold">Create club</h2>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Invite friends now or add them later.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200">
                  <FaUsers className="opacity-80" /> {selectedFriendIds.length} invited
                </span>
              </div>

              <input
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                placeholder="Club name"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-indigo-500/30 focus:ring-4 dark:border-slate-700 dark:bg-slate-800"
              />
              <textarea
                value={clubDescription}
                onChange={(e) => setClubDescription(e.target.value)}
                placeholder="Description (optional)"
                className="mt-2 h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-indigo-500/30 focus:ring-4 dark:border-slate-700 dark:bg-slate-800"
              />

              <div className="mt-3">
                <p className="text-left text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Invite friends
                </p>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/40">
                  <FaSearch className="text-slate-400" />
                  <input
                    value={friendSearch}
                    onChange={(e) => setFriendSearch(e.target.value)}
                    placeholder="Search friends..."
                    className="w-full bg-transparent text-left outline-none"
                  />
                </div>
                <div className="mt-2 max-h-36 overflow-y-auto space-y-1 pr-1">
                  {filteredFriends.length === 0 ? (
                    <p className="text-left text-xs text-slate-500">No friends found.</p>
                  ) : (
                    filteredFriends.map((friend) => (
                      <label
                        key={friend._id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/60 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/30"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-left">
                          <Avatar src={friend.avatar} name={friend.name} sizeClassName="h-7 w-7" />
                          <span className="truncate">{friend.name}</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={selectedFriendIds.includes(friend._id)}
                          onChange={() => toggleFriendSelection(friend._id)}
                          className="h-4 w-4 accent-indigo-600"
                        />
                      </label>
                    ))
                  )}
                </div>
              </div>

              <button
                onClick={createClub}
                disabled={creatingClub || !clubName.trim()}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {creatingClub ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FaUsers /> Create club
                  </>
                )}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-left text-lg font-bold">My clubs</h2>
                <span className="text-xs text-slate-500">{clubs.length}</span>
              </div>

              <div className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/40">
                <FaSearch className="text-slate-400" />
                <input
                  value={clubSearch}
                  onChange={(e) => setClubSearch(e.target.value)}
                  placeholder="Search clubs..."
                  className="w-full bg-transparent text-left outline-none"
                />
              </div>
              <div className="space-y-2">
                {filteredClubs.map((club) => (
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
                {filteredClubs.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-left text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                    {clubs.length === 0 ? (
                      <>
                        <p className="font-semibold">No clubs yet</p>
                        <p className="mt-1 text-xs text-slate-500">Create your first club to start voting together.</p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-500">No clubs match your search.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </aside>

          <section className="lg:col-span-2 space-y-4">
            {clubDetailsLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
                <div className="h-7 w-64 animate-pulse rounded bg-slate-200/70 dark:bg-slate-700/60" />
                <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-200/70 dark:bg-slate-700/60" />
                <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-slate-200/70 dark:bg-slate-700/60" />
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="h-16 animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-700/60"
                    />
                  ))}
                </div>
              </div>
            ) : !selectedClub ? (
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-10 text-left shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
                <h2 className="text-lg font-bold">Pick a club</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Select a club on the left to manage members, add movies, and vote.
                </p>
                {clubs.length === 0 && (
                  <div className="mt-5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4">
                    <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-200">
                      Tip: create your first club
                    </p>
                    <p className="mt-1 text-xs text-indigo-700/80 dark:text-indigo-200/80">
                      Give it a fun name, invite friends, then add a few movies for the group to vote on.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="truncate text-2xl font-extrabold">{selectedClub.name}</h1>
                        {isOwner && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-200">
                            <FaCrown /> Owner
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {selectedClub.description || "No description yet."}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
                          <Avatar src={selectedClub.owner?.avatar} name={selectedClub.owner?.name} sizeClassName="h-6 w-6" />
                          {selectedClub.owner?.name || "Owner"}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
                          <FaUsers className="opacity-80" /> {selectedClub.members?.length || 0} members
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
                          <FaFilm className="opacity-80" /> {selectedClub.watchlist?.length || 0} movies
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:w-56">
                      <div className="rounded-xl border border-slate-200 bg-white/70 p-3 text-left dark:border-slate-800 dark:bg-slate-900/40">
                        <p className="text-xs text-slate-500">Top voted</p>
                        <p className="mt-1 truncate text-sm font-semibold">{sortedWatchlist[0]?.title || "-"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white/70 p-3 text-left dark:border-slate-800 dark:bg-slate-900/40">
                        <p className="text-xs text-slate-500">Votes</p>
                        <p className="mt-1 text-sm font-semibold">{sortedWatchlist[0]?.votes?.length || 0}</p>
                      </div>
                    </div>
                  </div>

                  {selectedClub.nextMovieNight && (
                    <div className="mt-5 overflow-hidden rounded-xl border border-emerald-500/25 bg-emerald-500/10">
                      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          {selectedClub.nextMovieNight.posterPath ? (
                            <img
                              src={selectedClub.nextMovieNight.posterPath}
                              alt={selectedClub.nextMovieNight.title || "movie"}
                              className="h-12 w-12 rounded-lg object-cover ring-1 ring-emerald-500/20"
                              loading="lazy"
                            />
                          ) : (
                            <div className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-200">
                              <FaCalendarAlt />
                            </div>
                          )}
                          <div className="text-left">
                            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                              Next movie night pick
                            </p>
                            <p className="text-sm font-semibold">
                              <Link
                                to={`/movie/${selectedClub.nextMovieNight.movieId}`}
                                className="underline decoration-emerald-500/50 underline-offset-4"
                              >
                                {selectedClub.nextMovieNight.title}
                              </Link>
                            </p>
                            {selectedClub.nextMovieNight.scheduledFor && (
                              <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-200/80">
                                {new Date(selectedClub.nextMovieNight.scheduledFor).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-left text-lg font-bold">Members</h2>
                    <span className="text-xs text-slate-500">{selectedClub.members?.length || 0}</span>
                  </div>
                  <div className="space-y-2">
                    {selectedClub.members.map((member) => {
                      const isMemberOwner = selectedClub.owner?._id === member._id;
                      const canRemove = !isMemberOwner && (isOwner || member._id === user._id);

                      return (
                        <div
                          key={member._id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/30"
                        >
                          <div className="flex min-w-0 items-center gap-3 text-left">
                            <Avatar src={member.avatar} name={member.name} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {member.name}
                                {isMemberOwner ? (
                                  <span className="ml-1 align-middle text-xs text-amber-600 dark:text-amber-200">
                                    (Owner)
                                  </span>
                                ) : null}
                              </p>
                              <p className="truncate text-xs text-slate-500">{member.email}</p>
                            </div>
                          </div>

                          {canRemove && (
                            <button
                              onClick={() => removeMember(member._id)}
                              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                              title="Remove member"
                            >
                              <FaTrash />
                              Remove
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {isOwner && availableFriendsToAdd.length > 0 && (
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <select
                        value={addMemberId}
                        onChange={(e) => setAddMemberId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-1"
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
                        disabled={!addMemberId || addingMember}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                      >
                        {addingMember ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <FaPlus /> Add
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div className="text-left">
                      <h2 className="text-lg font-bold">Watchlist + Voting</h2>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        Add movies, vote for your favorite, and let the owner finalize the next movie night.
                      </p>
                    </div>
                    <div className="text-left text-xs text-slate-500">{sortedWatchlist.length} movies</div>
                  </div>

                  <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                    <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/40">
                      <FaSearch className="text-slate-400" />
                      <input
                        value={movieQuery}
                        onChange={(e) => setMovieQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && searchMovies()}
                        placeholder="Search movies to add..."
                        className="w-full bg-transparent text-left outline-none"
                      />
                    </div>
                    <button
                      onClick={searchMovies}
                      disabled={isSearchingMovies || !movieQuery.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <FaSearch /> {isSearchingMovies ? "Searching..." : "Search"}
                    </button>
                  </div>

                  {movieResults.length > 0 && (
                    <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {movieResults.slice(0, 6).map((movie) => (
                        <div
                          key={movie.imdbID}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/60 p-3 dark:border-slate-800 dark:bg-slate-900/30"
                        >
                          <div className="flex min-w-0 items-center gap-3 text-left">
                            {movie.Poster && movie.Poster !== "N/A" ? (
                              <img
                                src={movie.Poster}
                                alt={movie.Title || "movie"}
                                className="h-10 w-10 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-800"
                                loading="lazy"
                              />
                            ) : (
                              <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                                <FaFilm />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{movie.Title}</p>
                              <p className="text-xs text-slate-500">{movie.Year}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => addMovieToClub(movie)}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            <FaPlus /> Add
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    {sortedWatchlist.map((movie) => {
                      const voted = hasVoted(movie.votes);
                      const isTopVoted = topVotedMovieId && movie.movieId === topVotedMovieId;
                      const isPicked = selectedClub.nextMovieNight?.movieId === movie.movieId;

                      return (
                        <div
                          key={movie.movieId}
                          className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                            isPicked
                              ? "border-emerald-500/40 bg-emerald-500/10"
                              : isTopVoted
                                ? "border-indigo-500/40 bg-indigo-500/10"
                                : "border-slate-200 bg-white/60 dark:border-slate-800 dark:bg-slate-900/30"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            {movie.posterPath ? (
                              <img
                                src={movie.posterPath}
                                alt={movie.title || "movie"}
                                className="h-14 w-14 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-800"
                                loading="lazy"
                              />
                            ) : (
                              <div className="grid h-14 w-14 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                                <FaFilm />
                              </div>
                            )}

                            <div className="min-w-0 text-left">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  to={`/movie/${movie.movieId}`}
                                  className="truncate font-semibold hover:underline"
                                >
                                  {movie.title}
                                </Link>
                                {isPicked && (
                                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                                    Picked
                                  </span>
                                )}
                                {!isPicked && isTopVoted && movie.votes.length > 0 && (
                                  <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-200">
                                    Top voted
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                {movie.releaseDate || "N/A"} •{" "}
                                <span className="font-semibold">{movie.votes.length}</span> votes
                                {movie.addedBy?.name ? ` • Added by ${movie.addedBy.name}` : ""}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => toggleVote(movie.movieId)}
                              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                                voted
                                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                              }`}
                            >
                              <FaVoteYea /> {voted ? "Voted" : "Vote"}
                            </button>
                            <button
                              onClick={() => removeMovieFromClub(movie.movieId)}
                              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                            >
                              <FaTrash /> Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {sortedWatchlist.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-left text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                        <p className="font-semibold">No movies yet</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Search movies above and add a few options for your group to vote on.
                        </p>
                      </div>
                    )}
                  </div>

                  {isOwner && sortedWatchlist.length > 0 && (
                    <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-left">
                          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                            Finalize next movie night
                          </p>
                          <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-200/80">
                            This will pick the most-voted movie from the watchlist.
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            type="datetime-local"
                            value={scheduledFor}
                            onChange={(e) => setScheduledFor(e.target.value)}
                            className="w-full rounded-xl border border-emerald-500/25 bg-white/70 px-3 py-2 text-sm dark:border-emerald-500/20 dark:bg-slate-900/40 sm:w-auto"
                          />
                          <button
                            onClick={finalizeNextMovieNight}
                            disabled={finalizingMovieNight}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                          >
                            {finalizingMovieNight ? (
                              <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                Picking...
                              </>
                            ) : (
                              <>
                                <FaCalendarAlt /> Pick top voted
                              </>
                            )}
                          </button>
                        </div>
                      </div>
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
