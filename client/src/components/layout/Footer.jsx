import { useState } from "react";
import { Link } from "react-router-dom";
import { FaGithub, FaLinkedin, FaGlobe, FaArrowUp } from "react-icons/fa";
import PolicyModal from "./PolicyModal";

const Footer = () => {
  const [activePolicy, setActivePolicy] = useState(null);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <footer className="mt-auto border-t border-gray-200 bg-white px-3 pb-8 pt-10 transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900 sm:px-5 md:px-8 lg:px-12">
      <div className="mx-auto mb-10 grid w-full max-w-7xl grid-cols-1 gap-8 md:grid-cols-4 md:gap-10">
        <div className="md:col-span-2">
          <Link
            to="/"
            className="mb-3 inline-block text-2xl font-black tracking-tighter text-red-500 transition-colors hover:text-red-400 sm:text-3xl"
          >
            CineCircle
          </Link>
          <p className="max-w-md break-words leading-relaxed text-gray-400">
            Your ultimate destination for discovering, tracking, and sharing your cinematic journey with friends. Join
            the circle and never miss a masterpiece.
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">Navigation</h4>
          <ul className="space-y-3">
            <li>
              <Link to="/" className="text-gray-500 transition-colors hover:text-red-500 dark:text-gray-400">
                Home
              </Link>
            </li>
            <li>
              <Link to="/watchlist" className="text-gray-500 transition-colors hover:text-red-500 dark:text-gray-400">
                Watchlist
              </Link>
            </li>
            <li>
              <Link to="/friends" className="text-gray-500 transition-colors hover:text-red-500 dark:text-gray-400">
                Friends
              </Link>
            </li>
            <li>
              <Link
                to="/notifications"
                className="text-gray-500 transition-colors hover:text-red-500 dark:text-gray-400"
              >
                Notifications
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">Connect</h4>
          <div className="mb-5 flex flex-wrap gap-3">
            <a
              href="https://pratik-web.vercel.app/"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-all hover:text-red-500 dark:bg-gray-800 dark:text-gray-400"
              title="Portfolio"
            >
              <FaGlobe size={18} />
            </a>
            <a
              href="https://github.com/pratikdas018"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-all hover:text-red-500 dark:bg-gray-800 dark:text-gray-400"
              title="GitHub"
            >
              <FaGithub size={18} />
            </a>
            <a
              href="https://www.linkedin.com/in/pratik018/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-all hover:text-red-500 dark:bg-gray-800 dark:text-gray-400"
              title="LinkedIn"
            >
              <FaLinkedin size={18} />
            </a>
          </div>
          <p className="break-words text-xs text-gray-500">Support: cinecircle.co2026@gmail.com</p>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 border-t border-gray-200 pt-6 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
        <p className="text-center text-sm text-gray-500 md:text-left">
          Copyright {new Date().getFullYear()} CineCircle. All rights reserved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 md:justify-end">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
            <button
              onClick={() => setActivePolicy("privacy")}
              className="cursor-pointer transition-colors hover:text-red-500 dark:hover:text-red-400"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setActivePolicy("terms")}
              className="cursor-pointer transition-colors hover:text-red-500 dark:hover:text-red-400"
            >
              Terms of Service
            </button>
          </div>
          <button
            onClick={scrollToTop}
            className="group flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-gray-500 shadow-lg transition-all hover:text-red-500 dark:border-transparent dark:bg-gray-800 dark:text-gray-400"
            title="Back to Top"
          >
            <FaArrowUp size={16} className="transition-transform group-hover:-translate-y-1" />
          </button>
        </div>
      </div>

      <PolicyModal activePolicy={activePolicy} onClose={() => setActivePolicy(null)} />
    </footer>
  );
};

export default Footer;
