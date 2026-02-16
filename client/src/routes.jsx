import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import MovieDetails from "./pages/MovieDetails";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Watchlist from "./pages/Watchlist";
import Friends from "./pages/Friends";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import VerifyOTP from "./pages/VerifyOTP";
import Admin from "./pages/Admin";
import Clubs from "./pages/Clubs";
import AvailabilityAlerts from "./pages/AvailabilityAlerts";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/movie/:id" element={<MovieDetails />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/verify-otp" element={<VerifyOTP />} />

    <Route element={<ProtectedRoute />}>
      <Route path="/watchlist" element={<Watchlist />} />
      <Route path="/clubs" element={<Clubs />} />
      <Route path="/alerts" element={<AvailabilityAlerts />} />
      <Route path="/friends" element={<Friends />} />
      <Route path="/chat/:id" element={<Chat />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile/:id" element={<Profile />} />
      <Route path="/notifications" element={<Notifications />} />
    </Route>

    <Route element={<ProtectedRoute adminOnly />}>
      <Route path="/admin" element={<Admin />} />
    </Route>
  </Routes>
);

export default AppRoutes;
