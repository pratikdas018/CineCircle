import { BrowserRouter, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ThemeProvider } from "./context/ThemeContext";
import AppRoutes from "./routes";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import { Toaster } from "react-hot-toast";
import { AnimatePresence } from "framer-motion";

const AnimatedApp = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-all duration-500 ease-in-out">
      <Toaster position="bottom-center" />
      <Navbar />
      <main className="flex-grow w-full overflow-x-hidden">
        <AnimatePresence mode="wait">
          <AppRoutes key={location.pathname} />
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
};

function AppWrapper() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <AuthContext.Consumer>
              {({ user }) => (
                <SocketProvider user={user}>
                  <BrowserRouter>
                    <AnimatedApp />
                  </BrowserRouter>
                </SocketProvider>
              )}
            </AuthContext.Consumer>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default AppWrapper;
