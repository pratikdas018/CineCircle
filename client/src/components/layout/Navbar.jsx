import { useState, useContext, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { FaGoogle } from "react-icons/fa";
import { AuthContext } from "../../context/AuthContext";
import { NotificationContext } from "../../context/NotificationContext";

const Navbar = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const { user, logout, loginWithGoogle } = useContext(AuthContext);
  const { unreadCount } = useContext(NotificationContext);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsGoogleLoading(true);
      try {
        await loginWithGoogle(tokenResponse.access_token);
        closeMenu();
        navigate("/", { replace: true });
      } catch (error) {
        console.error("Google Login Error:", error);
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: (error) => console.error("Google Login Failed:", error),
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const navLinks = [
    { name: "Home", path: "/" },
    ...(user
      ? [
          { name: "Watchlist", path: "/watchlist" },
          { name: "Clubs", path: "/clubs" },
          { name: "Alerts", path: "/alerts" },
          { name: "Friends", path: "/friends" },
          ...(user.role === "admin" ? [{ name: "Admin", path: "/admin" }] : []),
        ]
      : []),
  ];

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2" onClick={closeMenu}>
              <span className="text-2xl">🎬</span>
              <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-orange-500">
                CineCircle
              </span>
            </Link>
            <div className="hidden md:ml-8 md:flex md:space-x-4">
              {navLinks.map((link) => (
                <NavLink
                  key={link.name}
                  to={link.path}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
                        : "text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 lg:gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors"
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>

            {user ? (
              <>
                <Link to="/notifications" className="relative p-2 text-slate-500 hover:text-indigo-600 transition-colors">
                  <span>🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <Link to="/profile" className="flex items-center gap-2 group">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">
                    {user.name}
                  </span>
                </Link>
                <button
                  onClick={logout}
                  className="text-sm font-medium text-slate-500 hover:text-rose-500 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => !isGoogleLoading && googleLogin()}
                  className={`flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm ${isGoogleLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Sign in with Google"
                >
                  <FaGoogle className={isGoogleLoading ? "animate-spin" : "text-rose-500"} />
                  <span className="hidden lg:inline">{isGoogleLoading ? "Connecting..." : "Google"}</span>
                </button>
                <Link
                  to="/login"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md"
                >
                  Login
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none transition-colors"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <span className="text-2xl">✕</span> : <span className="text-2xl">☰</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${isOpen ? "block" : "hidden"} md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 animate-fade-in`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                onClick={closeMenu}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-base font-medium ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
                      : "text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
          
          {!user && (
            <div className="space-y-2 pt-2">
              <button
                onClick={() => { googleLogin(); closeMenu(); }}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-base font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
              >
                <FaGoogle className="text-rose-500" />
                Sign in with Google
              </button>
              <NavLink 
                to="/login" 
                onClick={closeMenu}
                className="block px-3 py-2 rounded-md text-base font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30"
              >
                Login / Register
              </NavLink>
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="text-lg">{theme === "light" ? "🌙" : "☀️"}</span>
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>
          {user && (
            <>
              <NavLink to="/notifications" onClick={closeMenu} className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 dark:text-slate-300">
                Notifications {unreadCount > 0 && `(${unreadCount})`}
              </NavLink>
              <NavLink to="/profile" onClick={closeMenu} className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 dark:text-slate-300">
                Profile
              </NavLink>
              <button onClick={() => { logout(); closeMenu(); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10">
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
