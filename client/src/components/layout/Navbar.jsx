import { useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { NotificationContext } from "../../context/NotificationContext";
import { SocketContext } from "../../context/SocketContext";
import { toast } from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { unreadCount, setUnreadCount } = useContext(NotificationContext);
  const socket = useContext(SocketContext);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // 🔢 Fetch initial unread count on mount
  useEffect(() => {
    if (user) {
      api.get("/api/notifications/unread-count")
        .then(res => setUnreadCount(res.data.count))
        .catch(err => console.error("Failed to fetch unread count", err));
    }
  }, [user, setUnreadCount]);

  useEffect(() => {
    if (user && socket) {
      const handleNotification = (data) => {
        // 🔊 Play notification sound
        const audio = new Audio("/notification.mp3");
        audio.play().catch((err) => console.log("Audio play blocked or failed", err));

        setUnreadCount((prev) => prev + 1);

        const message = data.type === "like"
          ? `❤️ ${data.senderName} liked your review for ${data.movieTitle}`
          : data.type === "mention"
          ? `📣 ${data.senderName} mentioned you in a comment on ${data.movieTitle}`
          : `💬 ${data.senderName} commented on your review for ${data.movieTitle}`;

        toast(message, {
          icon: "🔔",
          style: { borderRadius: "10px", background: "#333", color: "#fff" },
        });
      };

      socket.on("getNotification", handleNotification);
      return () => socket.off("getNotification", handleNotification);
    }
  }, [user, socket, setUnreadCount]);

  return (
    <nav className="bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 px-8 py-3 flex justify-between items-center sticky top-0 z-50 backdrop-blur-md transition-all duration-500 ease-in-out">
      <Link to="/" className="text-2xl font-black text-rose-600 tracking-tighter hover:text-rose-500 transition-all">
        CineCircle
      </Link>

      <div className="flex items-center gap-6">
        {user ? (
          <>
            <Link to="/" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold transition-colors">Home</Link>
            <Link to="/watchlist" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold transition-colors">Watchlist</Link>
            <Link to="/friends" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold transition-colors">Friends</Link>
            
            {/* 🔔 Notification Icon */}
            <Link to="/notifications" className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 group">
              <span className="text-xl group-hover:scale-110 inline-block transition-transform">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-red-600 text-[10px] font-bold text-white items-center justify-center border-2 border-gray-900">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </span>
              )}
            </Link>

            {/* 🌓 Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-all text-xl shadow-inner relative h-10 w-10 flex items-center justify-center overflow-hidden"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ y: -20, opacity: 0, rotate: -45 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  exit={{ y: 20, opacity: 0, rotate: 45 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  {theme === 'dark' ? '☀️' : '🌙'}
                </motion.span>
              </AnimatePresence>
            </button>

            <Link to="/profile" className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold border-2 border-slate-200 dark:border-slate-700 hover:border-rose-500 transition-all overflow-hidden">
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
            </Link>
            
            <button
              onClick={handleLogout}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-bold transition-all border border-slate-200 dark:border-slate-700"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium">Login</Link>
            <Link to="/register" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-bold transition-all shadow-lg">
              Join Now
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;