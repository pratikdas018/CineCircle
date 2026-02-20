import { useState, useContext, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { FaGoogle, FaBars, FaTimes, FaBell, FaMoon, FaSun } from "react-icons/fa";
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
  const toggleMenu = () => setIsOpen((prev) => !prev);
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
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white transition-colors duration-500 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-5 md:px-8 lg:px-12">
        <div className="flex h-16 w-full items-center justify-between gap-2">
          <div className="flex min-w-0 items-center">
            <Link to="/" className="flex min-w-0 items-center gap-2" onClick={closeMenu}>
              <span className="text-lg font-bold text-slate-700 dark:text-slate-100 sm:text-xl">CC</span>
              <span className="truncate bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-base font-bold text-transparent sm:text-lg">
                CineCircle
              </span>
            </Link>
            <div className="ml-6 hidden items-center gap-1 lg:flex">
              {navLinks.map((link) => (
                <NavLink
                  key={link.name}
                  to={link.path}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400"
                        : "text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
                    }`
                  }
                >
                  {link.name}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="hidden min-w-0 items-center gap-2 md:flex lg:gap-3">
            <button
              onClick={toggleTheme}
              className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-400"
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === "light" ? <FaMoon /> : <FaSun />}
            </button>

            {user ? (
              <>
                <Link to="/notifications" className="relative p-2 text-slate-500 transition-colors hover:text-indigo-600">
                  <FaBell />
                  {unreadCount > 0 && (
                    <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <Link to="/profile" className="group flex min-w-0 items-center gap-2">
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 text-sm font-bold text-white flex items-center justify-center">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="hidden max-w-[120px] truncate text-sm font-medium text-slate-700 transition-colors group-hover:text-indigo-600 dark:text-slate-200 lg:block">
                    {user.name}
                  </span>
                </Link>
                <button
                  onClick={logout}
                  className="shrink-0 text-sm font-medium text-slate-500 transition-colors hover:text-rose-500"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => !isGoogleLoading && googleLogin()}
                  className={`flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 ${
                    isGoogleLoading ? "cursor-not-allowed opacity-50" : ""
                  }`}
                  title="Sign in with Google"
                >
                  <FaGoogle className={isGoogleLoading ? "animate-spin" : "text-rose-500"} />
                  <span className="hidden lg:inline">{isGoogleLoading ? "Connecting..." : "Google"}</span>
                </button>
                <Link
                  to="/login"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700"
                >
                  Login
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center lg:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"
              aria-label="Toggle navigation menu"
            >
              {isOpen ? <FaTimes className="text-lg" /> : <FaBars className="text-lg" />}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`${isOpen ? "block" : "hidden"} border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:hidden`}
      >
        <div className="space-y-1 px-3 pb-4 pt-2 sm:px-5">
          {navLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              onClick={closeMenu}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-base font-medium ${
                  isActive
                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400"
                    : "text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}

          {!user && (
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  googleLogin();
                  closeMenu();
                }}
                className="flex w-full items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-base font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <FaGoogle className="text-rose-500" />
                Sign in with Google
              </button>
              <NavLink
                to="/login"
                onClick={closeMenu}
                className="block rounded-md border border-indigo-100 px-3 py-2 text-base font-bold text-indigo-600 dark:border-indigo-900/30 dark:text-indigo-400"
              >
                Login / Register
              </NavLink>
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-base font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === "light" ? <FaMoon /> : <FaSun />}
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>

          {user && (
            <>
              <NavLink
                to="/notifications"
                onClick={closeMenu}
                className="block rounded-md px-3 py-2 text-base font-medium text-slate-600 dark:text-slate-300"
              >
                Notifications {unreadCount > 0 && `(${unreadCount})`}
              </NavLink>
              <NavLink
                to="/profile"
                onClick={closeMenu}
                className="block rounded-md px-3 py-2 text-base font-medium text-slate-600 dark:text-slate-300"
              >
                Profile
              </NavLink>
              <button
                onClick={() => {
                  logout();
                  closeMenu();
                }}
                className="block w-full rounded-md px-3 py-2 text-left text-base font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10"
              >
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
