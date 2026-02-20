import { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import PageTransition from "../components/layout/PageTransition";
import { toast } from "react-hot-toast";

const defaultStats = {
  users: 0,
  reviews: 0,
  messages: 0,
  reminders: 0,
  watchlistItems: 0,
  clubs: 0,
  availabilityAlerts: 0,
  newUsersLast7Days: 0,
  newReviewsLast7Days: 0,
};

const EMAIL_TYPES = [
  { value: "feature_update", label: "Feature Update" },
  { value: "maintenance_notice", label: "Maintenance Notice" },
  { value: "offer_announcement", label: "Offer Announcement" },
  { value: "general_update", label: "General Update" },
];

const DEFAULT_EMAIL_DRAFT = {
  subject: "CineCircle Update",
  body: "Hello CineCircle users,\n\nWe are sharing an update from our team. Please stay tuned for more improvements.\n\nBest regards,\nCineCircle Team",
};

const Admin = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [stats, setStats] = useState(defaultStats);
  const [usersData, setUsersData] = useState({ users: [], page: 1, pages: 1, total: 0 });
  const [reviewsData, setReviewsData] = useState({ reviews: [], page: 1, pages: 1, total: 0 });
  const [userSearch, setUserSearch] = useState("");
  const [reviewSearch, setReviewSearch] = useState("");
  const [emailType, setEmailType] = useState("feature_update");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [loadingEmailLogs, setLoadingEmailLogs] = useState(true);
  const [emailLogsData, setEmailLogsData] = useState({ logs: [], page: 1, pages: 1, total: 0 });

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const { data } = await api.get("/api/admin/stats");
      setStats(data);
    } catch {
      toast.error("Failed to load admin stats");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchUsers = useCallback(async (page = 1, q = "") => {
    try {
      setLoadingUsers(true);
      const { data } = await api.get(`/api/admin/users?page=${page}&limit=10&q=${encodeURIComponent(q)}`);
      setUsersData(data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchReviews = useCallback(async (page = 1, q = "") => {
    try {
      setLoadingReviews(true);
      const { data } = await api.get(`/api/admin/reviews?page=${page}&limit=10&q=${encodeURIComponent(q)}`);
      setReviewsData(data);
    } catch {
      toast.error("Failed to load reviews");
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  const fetchEmailLogs = useCallback(async (page = 1) => {
    try {
      setLoadingEmailLogs(true);
      const { data } = await api.get(`/api/admin/emails/logs?page=${page}&limit=10`);
      setEmailLogsData(data);
    } catch {
      toast.error("Failed to load email logs");
    } finally {
      setLoadingEmailLogs(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchStats();
      fetchUsers(1, "");
      fetchReviews(1, "");
      fetchEmailLogs(1);
    }
  }, [user, fetchStats, fetchUsers, fetchReviews, fetchEmailLogs]);

  const updateRole = async (targetUser, role) => {
    try {
      await api.put(`/api/admin/users/${targetUser._id}/role`, { role });
      toast.success(`Role updated to ${role}`);
      fetchUsers(usersData.page, userSearch);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update role");
    }
  };

  const deleteUser = async (targetUser) => {
    if (!window.confirm(`Delete user "${targetUser.name}"? This action is permanent.`)) return;

    try {
      await api.delete(`/api/admin/users/${targetUser._id}`);
      toast.success("User deleted");
      fetchUsers(usersData.page, userSearch);
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete user");
    }
  };

  const deleteReview = async (reviewId) => {
    if (!window.confirm("Delete this review?")) return;

    try {
      await api.delete(`/api/admin/reviews/${reviewId}`);
      toast.success("Review deleted");
      fetchReviews(reviewsData.page, reviewSearch);
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete review");
    }
  };

  const generateAiEmail = async () => {
    try {
      setGeneratingEmail(true);
      const { data } = await api.post("/api/admin/generate-email", { emailType });
      const subject = String(data?.subject || "").trim();
      const body = String(data?.body || "").trim();
      setEmailSubject(subject || DEFAULT_EMAIL_DRAFT.subject);
      setEmailBody(body || DEFAULT_EMAIL_DRAFT.body);
      toast.success("AI email generated");
    } catch (error) {
      setEmailSubject(DEFAULT_EMAIL_DRAFT.subject);
      setEmailBody(DEFAULT_EMAIL_DRAFT.body);
      toast.error(error.response?.data?.message || "Failed to generate AI email");
    } finally {
      setGeneratingEmail(false);
    }
  };

  const sendEmailToAllUsers = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error("Subject and body are required");
      return;
    }

    if (!window.confirm("Send this email to all registered users?")) return;

    try {
      setSendingEmail(true);
      const { data } = await api.post("/api/admin/send-broadcast", {
        subject: emailSubject,
        body: emailBody,
      });
      toast.success(`Broadcast completed: ${data.sent}/${data.attempted} sent`);
      fetchEmailLogs(1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send broadcast");
    } finally {
      setSendingEmail(false);
    }
  };

  if (!user || user.role !== "admin") {
    return null;
  }

  const statCards = [
    { label: "Total Users", value: stats.users },
    { label: "Total Reviews", value: stats.reviews },
    { label: "Total Messages", value: stats.messages },
    { label: "Total Reminders", value: stats.reminders },
    { label: "Watchlist Items", value: stats.watchlistItems },
    { label: "Movie Clubs", value: stats.clubs },
    { label: "Availability Alerts", value: stats.availabilityAlerts },
    { label: "Users (7 days)", value: stats.newUsersLast7Days },
    { label: "Reviews (7 days)", value: stats.newReviewsLast7Days },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen w-full overflow-x-hidden bg-transparent px-3 py-4 text-slate-900 transition-colors duration-500 dark:text-slate-100 sm:px-5 md:px-8 md:py-8 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-6">
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold">Admin Panel</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Manage platform health, users, and reviews.
              </p>
            </div>
            <button
              onClick={() => {
                fetchStats();
                fetchUsers(usersData.page, userSearch);
                fetchReviews(reviewsData.page, reviewSearch);
                fetchEmailLogs(emailLogsData.page);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold"
            >
              Refresh
            </button>
          </header>

          <div className="flex gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
            {["overview", "users", "reviews", "emails"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-semibold capitalize ${
                  activeTab === tab
                    ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <section>
              {loadingStats ? (
                <div className="py-16 flex justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500" />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {statCards.map((card) => (
                    <div
                      key={card.label}
                      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5"
                    >
                      <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {card.label}
                      </p>
                      <p className="text-3xl font-extrabold mt-2">{card.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "users" && (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users by name/email"
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => fetchUsers(1, userSearch)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Search
                </button>
              </div>

              {loadingUsers ? (
                <div className="py-16 flex justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500" />
                </div>
              ) : (
                <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <table className="min-w-[720px] w-full text-left text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                      <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Verified</th>
                        <th className="px-4 py-3">Joined</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersData.users.map((u) => (
                        <tr key={u._id} className="border-t border-slate-200 dark:border-slate-800">
                          <td className="px-4 py-3">{u.name}</td>
                          <td className="px-4 py-3">{u.email}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-bold ${
                                u.role === "admin"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {u.role || "user"}
                            </span>
                          </td>
                          <td className="px-4 py-3">{u.isVerified ? "Yes" : "No"}</td>
                          <td className="px-4 py-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => updateRole(u, u.role === "admin" ? "user" : "admin")}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded"
                            >
                              Make {u.role === "admin" ? "User" : "Admin"}
                            </button>
                            <button
                              onClick={() => deleteUser(u)}
                              className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-3 py-1.5 rounded"
                            >
                              Delete
                            </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {usersData.users.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                            No users found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-500">Total: {usersData.total}</p>
                <div className="flex gap-2">
                  <button
                    disabled={usersData.page <= 1}
                    onClick={() => fetchUsers(usersData.page - 1, userSearch)}
                    className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="px-3 py-1.5 text-sm">
                    {usersData.page} / {usersData.pages}
                  </span>
                  <button
                    disabled={usersData.page >= usersData.pages}
                    onClick={() => fetchUsers(usersData.page + 1, userSearch)}
                    className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeTab === "reviews" && (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                  placeholder="Search reviews by title/comment"
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => fetchReviews(1, reviewSearch)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Search
                </button>
              </div>

              {loadingReviews ? (
                <div className="py-16 flex justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500" />
                </div>
              ) : (
                <div className="space-y-3">
                  {reviewsData.reviews.map((review) => (
                    <article
                      key={review._id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-lg">{review.movieTitle || review.movieId}</h3>
                          <p className="text-sm text-slate-500">
                            by {review.user?.name || "Unknown"} ({review.user?.email || "N/A"})
                          </p>
                          <p className="text-sm mt-2">{review.comment}</p>
                        </div>
                        <div className="flex flex-col md:items-end gap-2">
                          <span className="text-xs text-slate-500">
                            {new Date(review.createdAt).toLocaleString()}
                          </span>
                          <button
                            onClick={() => deleteReview(review._id)}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-3 py-1.5 rounded"
                          >
                            Delete Review
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                  {reviewsData.reviews.length === 0 && (
                    <div className="text-center py-10 text-slate-500">No reviews found.</div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-500">Total: {reviewsData.total}</p>
                <div className="flex gap-2">
                  <button
                    disabled={reviewsData.page <= 1}
                    onClick={() => fetchReviews(reviewsData.page - 1, reviewSearch)}
                    className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="px-3 py-1.5 text-sm">
                    {reviewsData.page} / {reviewsData.pages}
                  </span>
                  <button
                    disabled={reviewsData.page >= reviewsData.pages}
                    onClick={() => fetchReviews(reviewsData.page + 1, reviewSearch)}
                    className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeTab === "emails" && (
            <section className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
                  <h3 className="text-lg font-bold">Email Broadcast Panel</h3>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Email Type</span>
                    <select
                      value={emailType}
                      onChange={(e) => setEmailType(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                    >
                      {EMAIL_TYPES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex gap-3">
                    <button
                      onClick={generateAiEmail}
                      disabled={generatingEmail}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-semibold"
                    >
                      {generatingEmail ? "Generating..." : "Generate AI Email"}
                    </button>
                  </div>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Subject</span>
                    <input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Enter subject"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Body</span>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Enter email content"
                      rows={12}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 resize-y"
                    />
                  </label>

                  <button
                    onClick={sendEmailToAllUsers}
                    disabled={sendingEmail}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-semibold"
                  >
                    {sendingEmail ? "Sending..." : "Send to All Users"}
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
                  <h3 className="text-lg font-bold">Preview</h3>
                  <div className="min-h-64 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Subject</p>
                    <p className="text-lg font-semibold mt-1 break-words">
                      {emailSubject || "No subject generated yet"}
                    </p>
                    <hr className="my-4 border-slate-200 dark:border-slate-700" />
                    <p className="text-xs uppercase tracking-wide text-slate-500">Body</p>
                    <p className="mt-2 break-words whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                      {emailBody || "No content generated yet"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h3 className="text-lg font-bold">Email Logs</h3>
                  <button
                    onClick={() => fetchEmailLogs(emailLogsData.page)}
                    className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 text-sm"
                  >
                    Refresh Logs
                  </button>
                </div>

                {loadingEmailLogs ? (
                  <div className="py-10 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {emailLogsData.logs.map((log) => (
                      <article
                        key={log._id}
                        className="border border-slate-200 dark:border-slate-700 rounded-lg p-3"
                      >
                        <p className="font-semibold break-words">{log.subject}</p>
                        <p className="mt-1 line-clamp-3 break-words whitespace-normal text-sm text-slate-600 dark:text-slate-300">
                          {log.body}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          Sent: {log.totalUsersSent} users | By: {log.admin?.name || log.admin?.email || "Admin"} |
                          {" "}
                          {new Date(log.sentAt || log.createdAt).toLocaleString()}
                        </p>
                      </article>
                    ))}
                    {emailLogsData.logs.length === 0 && (
                      <p className="text-sm text-slate-500 py-4">No email logs yet.</p>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Admin;
