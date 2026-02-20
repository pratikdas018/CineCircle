import { useState, useContext, useEffect, useMemo } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";

const ResetPassword = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid reset link");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", {
        token,
        password: form.password,
      });
      setDone(true);
      toast.success("Password reset successful. Please login.");
      setTimeout(() => navigate("/login", { replace: true }), 700);
    } catch (err) {
      setError(err.response?.data?.message || "Reset password failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-gray-900 to-black px-3 py-6 sm:px-5 md:px-8 lg:px-12 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-800 p-5 shadow-2xl sm:p-8">
        <h2 className="text-3xl font-bold text-white mb-4 text-center">Reset Password</h2>
        <p className="text-gray-400 text-sm text-center mb-6">
          Set a new password for your CineCircle account.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-200 px-4 py-2 rounded-lg mb-4 text-sm text-center">
            {error}
          </div>
        )}

        {done ? (
          <div className="bg-green-500/10 border border-green-500 text-green-200 px-4 py-3 rounded-lg text-sm text-center">
            Password updated successfully. Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="password">
                New Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={form.password}
                placeholder="Enter new password"
                className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-500"
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={form.confirmPassword}
                placeholder="Re-enter new password"
                className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-500"
                onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </div>
            <button
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 rounded-lg shadow-lg transform transition hover:scale-[1.02] active:scale-95 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-gray-400">
          Back to <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
