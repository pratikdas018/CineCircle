import React from "react";
import { motion } from "framer-motion";

const PolicyModal = ({ activePolicy, onClose }) => {
  const policies = {
    privacy: {
      title: "Privacy Policy",
      content: "At CineCircle, your data is treated like a top-secret script. We only use your activity to curate the perfect watchlist and connect you with fellow cinephiles. No spoilers, no leaks, and absolutely no third-party sales.",
      icon: "🛡️"
    },
    terms: {
      title: "Terms of Service",
      content: "Welcome to the Circle. Rule #1: Respect the craft. Rule #2: No spoilers in public comments without warnings. Rule #3: Have fun. By using CineCircle, you agree to keep the community as vibrant as a Technicolor dream.",
      icon: "🎬"
    }
  };

  if (!activePolicy || !policies[activePolicy]) return null;

  const policy = policies[activePolicy];
  const isTerms = activePolicy === "terms";

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-3xl p-8 max-w-md w-full shadow-2xl transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-4xl mb-4">{policy.icon}</div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{policy.title}</h3>

        {isTerms ? (
          <div className="relative h-64 overflow-hidden mb-8 [perspective:400px] border-y border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/20 rounded-xl">
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: "-150%", opacity: [0, 1, 1, 0] }}
              transition={{ duration: 25, ease: "linear", repeat: Infinity }}
              className="text-yellow-500 font-black text-center leading-loose [transform:rotateX(25deg)] origin-bottom uppercase tracking-tighter px-4"
            >
              {policy.content}
            </motion.div>
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
            {policy.content}
          </p>
        )}

        <button 
          onClick={onClose}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-red-600/20"
        >
          Understood
        </button>
      </div>
    </div>
  );
};

export default PolicyModal;