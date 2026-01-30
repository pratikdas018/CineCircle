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
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pt-12 pb-8 px-8 mt-auto transition-colors duration-300">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        {/* Brand Section */}
        <div className="col-span-1 md:col-span-2">
          <Link to="/" className="text-3xl font-black text-red-500 tracking-tighter hover:text-red-400 transition-colors mb-4 inline-block">
            CineCircle
          </Link>
          <p className="text-gray-400 max-w-sm leading-relaxed">
            Your ultimate destination for discovering, tracking, and sharing your cinematic journey with friends. Join the circle and never miss a masterpiece.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-gray-900 dark:text-white font-bold mb-6 uppercase tracking-wider text-sm">Navigation</h4>
          <ul className="space-y-4">
            <li><Link to="/" className="text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors">Home</Link></li>
            <li><Link to="/watchlist" className="text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors">Watchlist</Link></li>
            <li><Link to="/friends" className="text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors">Friends</Link></li>
            <li><Link to="/notifications" className="text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors">Notifications</Link></li>
          </ul>
        </div>

        {/* Social/Contact */}
        <div>
          <h4 className="text-gray-900 dark:text-white font-bold mb-6 uppercase tracking-wider text-sm">Connect</h4>
          <div className="flex gap-4 mb-6">
            <a href="https://pratik-web.vercel.app/" className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center transition-all text-gray-500 dark:text-gray-400 hover:text-red-500" title="Portfolio">
              <FaGlobe size={20} />
            </a>
            <a href="https://github.com/pratikdas018" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center transition-all text-gray-500 dark:text-gray-400 hover:text-red-500" title="GitHub">
              <FaGithub size={20} />
            </a>
            <a href="https://www.linkedin.com/in/pratik018/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center transition-all text-gray-500 dark:text-gray-400 hover:text-red-500" title="LinkedIn">
              <FaLinkedin size={20} />
            </a>
          </div>
          <p className="text-gray-500 text-xs">
            Support: cinecircle.co2026@gmail.com
          </p>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-gray-500 text-sm">
          © {new Date().getFullYear()} CineCircle. All rights reserved.
        </p>
        <div className="flex items-center gap-8">
          <div className="flex gap-6 text-sm text-gray-500">
            <button onClick={() => setActivePolicy('privacy')} className="hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer">Privacy Policy</button>
            <button onClick={() => setActivePolicy('terms')} className="hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer">Terms of Service</button>
          </div>
          <button 
            onClick={scrollToTop}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center transition-all text-gray-500 dark:text-gray-400 hover:text-red-500 shadow-lg group border border-gray-200 dark:border-transparent"
            title="Back to Top"
          >
            <FaArrowUp size={18} className="group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>
      </div>

      <PolicyModal 
        activePolicy={activePolicy} 
        onClose={() => setActivePolicy(null)} 
      />
    </footer>
  );
};

export default Footer;